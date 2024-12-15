import os
import json
import shutil
import zipfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path


app = FastAPI()

origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

newest_json_path = None
current_dataset = None

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
    global current_dataset, newest_json_path
    file_type = file.content_type

    # Validate file type
    if file_type not in [
        "image/png", 
        "image/jpeg", 
        "audio/mid", 
        "application/json", 
        "application/x-zip-compressed"
    ]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Handle non-ZIP files (image, MIDI, JSON)
    if file_type != "application/x-zip-compressed":
        # Determine directory for the file
        directory = f"uploads/{'album' if file_type.startswith('image') else 'song' if file_type == 'audio/mid' else 'application'}"
        os.makedirs(directory, exist_ok=True)

        # Save the file
        file_location = os.path.join(directory, file.filename)
        with open(file_location, "wb") as buffer:
            buffer.write(await file.read())

        # If JSON file, update global newest_json_path
        if file_type == "application/json":
            newest_json_path = file_location
            return {
                "file_path": file_location, 
                "message": "JSON file uploaded and set as the newest."
            }

        # For images or MIDI files
        return {"file_path": file_location, "message": "File uploaded successfully."}

    # Handle ZIP files
    # Generate a unique directory name based on the ZIP file name (without extension)
    dataset_name = os.path.splitext(file.filename)[0]
    dataset_path = os.path.join("datasets", dataset_name)

    unmount_static_path(f"/datasets/{dataset_name}/album")
    unmount_static_path(f"/datasets/{dataset_name}/song")

    # If dataset already exists, clean up the directory
    if os.path.exists(dataset_path):
        shutil.rmtree(dataset_path)
        

    # Create dataset directories
    os.makedirs(dataset_path, exist_ok=True)
    song_directory = os.path.join(dataset_path, "song")
    album_directory = os.path.join(dataset_path, "album")
    os.makedirs(song_directory, exist_ok=True)
    os.makedirs(album_directory, exist_ok=True)

    # Extract ZIP file
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
        # Clean up temporary files in case of an error
        shutil.rmtree(temp_directory)
        raise HTTPException(status_code=500, detail=f"Error extracting ZIP file: {str(e)}")

    # Clean up temporary directory
    shutil.rmtree(temp_directory)

    # Update current dataset
    current_dataset = dataset_path

    # Dynamically mount static directories
    app.mount(f"/datasets/{dataset_name}/album", StaticFiles(directory=album_directory), name=f"{dataset_name}_album")
    app.mount(f"/datasets/{dataset_name}/song", StaticFiles(directory=song_directory), name=f"{dataset_name}_song")

    return {
        "message": f"ZIP file extracted and files sorted into '{dataset_name}' dataset.",
        "current_dataset": current_dataset
    }



@app.get("/gallery/")
async def get_gallery(request: Request):
    global current_dataset

    # Handle the case where no dataset has been uploaded or is not available
    if not current_dataset or not os.path.exists(current_dataset):
        return []  # Return an empty list to indicate no gallery items

    # Directories for album and song based on the current dataset
    album_dir = Path(os.path.join(current_dataset, "album"))
    song_dir = Path(os.path.join(current_dataset, "song"))

    # Ensure album and song subdirectories exist
    if not album_dir.exists() or not song_dir.exists():
        return []  # Return an empty list if subdirectories are missing

    base_url = str(request.base_url)

    # Load audio-to-pic mapping from JSON if available
    audio_to_pic = {}
    if newest_json_path:
        try:
            with open(newest_json_path, 'r') as f:
                json_data = json.load(f)
                audio_to_pic = {entry["audio_file"]: entry["pic_name"] for entry in json_data}
        except Exception:
            pass  # If JSON fails to load, proceed without mappings

    # Gather MIDI files from the song directory
    gallery_files = [file.name for file in song_dir.glob("*.mid") if file.is_file()]

    # Filter gallery files to include only those with associated pictures
    filtered_gallery_files = [file for file in gallery_files if file in audio_to_pic]

    # Build the result for the gallery
    result = [
        {
            "id": index + 1,
            "cover": f"{base_url}{current_dataset}/album/{audio_to_pic.get(midi_file, '').split('.')[0]}.jpg" if audio_to_pic.get(midi_file) else None,
            "title": midi_file,
            "src": f"{base_url}{current_dataset}/song/{midi_file}",
        }
        for index, midi_file in enumerate(filtered_gallery_files)
    ]

    return result
