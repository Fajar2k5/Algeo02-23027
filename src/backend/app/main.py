import os
import json
import shutil
import zipfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import midi_processor,image_processor,mic_controller,audio_converter
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH
import time
import ffmpeg
import imageio_ffmpeg

app = FastAPI()

origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mean_dataset = None
projected_dataset = None
eigenvectors = None
newest_json_path = None
current_dataset = None
result = []
preprocess_result = []

def unmount_static_path(path: str):
    """
    Helper function to unmount a previously mounted path.
    """
    if path in app.routes:
        app.routes = [route for route in app.routes if route.path != path]

@app.post("/reset/")
async def reset_dataset():
    """
    Endpoint to reset the current dataset.
    """
    global current_dataset
    current_dataset = None
    global newest_json_path
    newest_json_path = None
    print("Current dataset has been reset.")
    return {"message": "Dataset reset successfully.", "current_dataset": current_dataset}



@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    global current_dataset, newest_json_path,preprocess_result,eigenvectors,projected_dataset,mean_dataset
    file_type = file.content_type

    if file_type not in [
        "image/png", 
        "image/jpeg", 
        "audio/mid", 
        "application/json", 
        "application/x-zip-compressed"
    ]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if file_type != "application/x-zip-compressed":
        directory = f"uploads/{'album' if file_type.startswith('image') else 'song' if file_type == 'audio/mid' else 'application'}"
        os.makedirs(directory, exist_ok=True)

        file_location = os.path.join(directory, file.filename)
        with open(file_location, "wb") as buffer:
            buffer.write(await file.read())

        if file_type == "application/json":
            newest_json_path = file_location
            return {
                "file_path": file_location, 
                "message": "JSON file uploaded and set as the newest."
            }

        return {"file_path": file_location, "message": "File uploaded successfully."}

    
    dataset_name = os.path.splitext(file.filename)[0]
    dataset_path = os.path.join("datasets", dataset_name)

    unmount_static_path(f"/datasets/{dataset_name}/album")
    unmount_static_path(f"/datasets/{dataset_name}/song")

    if os.path.exists(dataset_path):
        shutil.rmtree(dataset_path)
        

    os.makedirs(dataset_path, exist_ok=True)
    song_directory = os.path.join(dataset_path, "song")
    album_directory = os.path.join(dataset_path, "album")
    os.makedirs(song_directory, exist_ok=True)
    os.makedirs(album_directory, exist_ok=True)

    temp_directory = f"temp_{file.filename}_extracted"
    os.makedirs(temp_directory, exist_ok=True)

    try:
        with zipfile.ZipFile(file.file, "r") as zip_ref:
            zip_ref.extractall(temp_directory)

        # Extracted files root
        extracted_files = os.listdir(temp_directory)
        root_extracted_path = (
            os.path.join(temp_directory, extracted_files[0]) if len(extracted_files) == 1 else temp_directory
        )

        # Move files to respective directories
        for filename in os.listdir(root_extracted_path):
            file_path = os.path.join(root_extracted_path, filename)
            if filename.endswith((".jpg", ".jpeg", ".png")):
                shutil.move(file_path, album_directory)
            elif filename.endswith((".midi", ".mid")):
                shutil.move(file_path, song_directory)

    except Exception as e:
        shutil.rmtree(temp_directory)
        raise HTTPException(status_code=500, detail=f"Error extracting ZIP file: {str(e)}")

    shutil.rmtree(temp_directory)

    current_dataset = dataset_path
    preprocess_result = midi_processor.process_all_midi_files_concurrently(song_directory)
    eigenvectors,projected_dataset,mean_dataset = image_processor.initialize_dataset_concurrently(current_dataset)

    app.mount(f"/datasets/{dataset_name}/album", StaticFiles(directory=album_directory), name=f"{dataset_name}_album")
    app.mount(f"/datasets/{dataset_name}/song", StaticFiles(directory=song_directory), name=f"{dataset_name}_song")

    return {
        "message": f"ZIP file extracted and files sorted into '{dataset_name}' dataset.",
        "current_dataset": current_dataset
    }



@app.get("/gallery/")
async def get_gallery(request: Request, search: str = ""):
    global current_dataset

    if not current_dataset or not os.path.exists(current_dataset):
        return []

    album_dir = Path(os.path.join(current_dataset, "album"))
    song_dir = Path(os.path.join(current_dataset, "song"))

    if not album_dir.exists() or not song_dir.exists():
        return []

    base_url = str(request.base_url)

    audio_to_pic = {}
    if newest_json_path:
        try:
            with open(newest_json_path, "r") as f:
                json_data = json.load(f)
                audio_to_pic = {entry["audio_file"]: entry["pic_name"] for entry in json_data}
        except Exception:
            pass

    gallery_images = [file.name for file in album_dir.glob("*.jpg") if file.is_file()]
    gallery_images += [file.name for file in album_dir.glob("*.jpeg") if file.is_file()]
    gallery_images += [file.name for file in album_dir.glob("*.png") if file.is_file()]

    gallery_files = [file.name for file in song_dir.glob("*.mid") if file.is_file()]

    mapped_images = set(audio_to_pic.values())  
    unmapped_images = [img for img in gallery_images if img not in mapped_images]

    if search.strip():
        gallery_files = [file for file in gallery_files if search.lower() in file.lower()]
        unmapped_images = [img for img in unmapped_images if search.lower() in img.lower()]

    result = []

    result += [
        {
            "id": index + 1,
            "cover": f"{base_url}datasets/{os.path.basename(current_dataset)}/album/{audio_to_pic.get(midi_file, '').split('.')[0]}.jpg"
            if audio_to_pic.get(midi_file)
            else None,
            "title": midi_file,
            "src": f"{base_url}datasets/{os.path.basename(current_dataset)}/song/{midi_file}",
        }
        for index, midi_file in enumerate(gallery_files)
    ]

    result += [
        {
            "id": len(result) + index + 1,
            "cover": f"{base_url}datasets/{os.path.basename(current_dataset)}/album/{img}",
            "title": img,
            "src": None,  
        }
        for index, img in enumerate(unmapped_images)
    ]

    return result



@app.post("/midi-query/")
async def midi_query(request: Request,file: UploadFile = File(...)):
    global current_dataset
    if not file.filename.endswith((".mid", ".midi")):
        raise HTTPException(status_code=400, detail="File must be a MIDI file")
    
    
    base_url = str(request.base_url)

    upload_file_path = f"uploads/song/{file.filename}"
    with open(upload_file_path, "wb") as f:
        f.write(await file.read())

    try:
        timenow = time.time()
        query_notes = midi_processor.get_midi_notes(upload_file_path)
        queries = midi_processor.get_feature(query_notes)
        sorted = midi_processor.compare(preprocess_result, queries)
        sorted_midi = midi_processor.get_similarities(sorted)
        timeend = time.time()
        
    except:
        raise HTTPException(status_code=500, detail="Error processing MIDI file")

    audio_to_pic = {}
    if newest_json_path:
        try:
            with open(newest_json_path, "r") as f:
                json_data = json.load(f)
                audio_to_pic = {entry["audio_file"]: entry["pic_name"] for entry in json_data}
        except Exception:
            pass
    
    time_taken = timeend - timenow

    result = [
        {
            "id": index + 1,
            "cover": f"{base_url}datasets/{os.path.basename(current_dataset)}/album/{audio_to_pic.get(os.path.basename(midi_file[0]), '').split('.')[0]}.jpg"
            if audio_to_pic.get(os.path.basename(midi_file[0]))
            else None,
            "title": os.path.basename(midi_file[0]),
            "src": f"{base_url}datasets/{os.path.basename(current_dataset)}/song/{os.path.basename(midi_file[0])}",
            "similarity_score": float(midi_file[1]), 
        }
        for index, midi_file in enumerate(sorted_midi)
    ]
    return {"result": result, "time_taken": time_taken}

@app.post("/image-query/")
async def image_query(request: Request,file: UploadFile = File(...)):
    global current_dataset
    print(file.filename)
    print(current_dataset)

    if not file.filename.endswith((".jpg", ".jpeg", ".png")):
        raise HTTPException(status_code=400, detail="File must be an image file")
    
    pic_to_audio = {}
    if newest_json_path:
        try:
            with open(newest_json_path, "r") as f:
                json_data = json.load(f)
                pic_to_audio = {entry["pic_name"]: entry["audio_file"] for entry in json_data}
        except Exception:
            pass
    
    print(pic_to_audio)

    base_url = str(request.base_url)
    upload_file_path = f"uploads/album/{file.filename}"

    with open(upload_file_path, "wb") as f:
        f.write(await file.read())
    
    print(upload_file_path)
    print(current_dataset)
    print(base_url)
    
    try:
        timenow = time.time()
        similarities, sorted_indices = image_processor.query_image(upload_file_path, eigenvectors, projected_dataset, mean_dataset)
        result = image_processor.get_similarities(similarities, sorted_indices)
        timeend = time.time()
    except:
        raise HTTPException(status_code=500, detail="Error processing image file")
    
    time_taken = timeend - timenow

    result = [
        {
            "id": index + 1,
            "cover": f"{base_url}datasets/{os.path.basename(current_dataset)}/album/{img}",
            "title": img,
            "src": f"{base_url}datasets/{os.path.basename(current_dataset)}/song/{pic_to_audio.get(img.split('.')[0], '')}",
            "similarity_score": float(similarity),
        }
        for index, (img, similarity) in enumerate(result)
    ]

    return {"result": result, "time_taken": time_taken}

@app.post("/humming-query/")
async def humming_query(file: UploadFile = File(...)):
    if not os.path.exists("uploads/humming"):
        os.makedirs("uploads/humming")

    recording_path = f"uploads/humming/{file.filename}"
    with open(recording_path, "wb") as f:
        f.write(await file.read())

    recording_output_ffmpeg = "uploads/humming/humming_output.wav"
    ffmpeg_binary = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Convert the uploaded audio to WAV
    ffmpeg.input(recording_path).output(
        recording_output_ffmpeg,
        format='wav',  # Explicit format
        ar=44100,
        ac=1
    ).run(cmd=ffmpeg_binary, overwrite_output=True)
    
    model_output, midi_data, note_events = predict(
        recording_output_ffmpeg,
        model_or_model_path=ICASSP_2022_MODEL_PATH,
        onset_threshold=0.6,
        frame_threshold=0.3,
        minimum_note_length=0.5
    )

    # Filter out low-confidence notes
    filtered_events = [note for note in note_events if note[3] > 0.25]

    humming_output_path = "uploads/humming/humming_output.mid"
    audio_converter.save_note_events_to_midi(filtered_events, humming_output_path)

    # DO NOT overwrite humming_output.mid again here.
    # Remove the following lines:
    # with open(humming_output_path, "wb") as f:
    #     f.write(await file.read())

    # Now proceed to extract notes and query as intended
    try:
        timenow = time.time()
        query_notes = midi_processor.get_midi_notes(humming_output_path)
        queries = midi_processor.get_feature(query_notes)
        sorted = midi_processor.compare(preprocess_result, queries)
        sorted_midi = midi_processor.get_similarities(sorted)
        timeend = time.time()
    except:
        raise HTTPException(status_code=500, detail="Error processing humming file")

    audio_to_pic = {}
    if newest_json_path:
        try:
            with open(newest_json_path, "r") as f:
                json_data = json.load(f)
                audio_to_pic = {entry["audio_file"]: entry["pic_name"] for entry in json_data}
        except Exception:
            pass
    
    time_taken = timeend - timenow

    result = [
        {
            "id": index + 1,
            "cover": f"{audio_to_pic.get(os.path.basename(midi_file[0]), '').split('.')[0]}.jpg"
            if audio_to_pic.get(os.path.basename(midi_file[0]))
            else None,
            "title": os.path.basename(midi_file[0]),
            "src": f"{os.path.basename(midi_file[0])}",
            "similarity_score": float(midi_file[1]),
        }
        for index, midi_file in enumerate(sorted_midi)
    ]

    print(result)

    return {"result": result, "time_taken": time_taken}
