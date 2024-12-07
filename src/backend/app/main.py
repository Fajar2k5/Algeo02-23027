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

if not os.path.exists("album"):
    os.makedirs("album")

if not os.path.exists("song"):
    os.makedirs("song")

app.mount("/album", StaticFiles(directory="album"), name="album")
app.mount("/song", StaticFiles(directory="song"), name="song")

newest_json_path = None

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_type = file.content_type

    if file_type not in ["image/png", "image/jpeg", "audio/mid", "application/json", "application/x-zip-compressed"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if file_type != "application/x-zip-compressed":
        directory = f"uploads/{'album' if file_type.startswith('image') else 'song' if file_type == 'audio/mid' else 'application'}"
        os.makedirs(directory, exist_ok=True)
        
        file_location = f"{directory}/{file.filename}"
        with open(file_location, "wb") as buffer:
            buffer.write(await file.read())
        
        if file_type == "application/json":
            global newest_json_path
            newest_json_path = file_location
            return {"file_path": file_location, "message": "JSON file uploaded and set as the newest."}
        
        return {"file_path": file_location, "message": "File uploaded successfully."}

    if os.path.exists("album"):
        shutil.rmtree("album")
    if os.path.exists("song"):
        shutil.rmtree("song")

    os.makedirs("album", exist_ok=True)
    os.makedirs("song", exist_ok=True)

    # Extract ZIP file
    zip_directory = f"temp_{file.filename}_extracted"
    os.makedirs(zip_directory, exist_ok=True)

    with zipfile.ZipFile(file.file, 'r') as zip_ref:
        zip_ref.extractall(zip_directory)

    extracted_files = os.listdir(zip_directory)
    folderfiles = os.path.join(zip_directory, extracted_files[0])
    print(f"Extracted files: {folderfiles}")

    for filename in os.listdir(folderfiles):
        if filename.endswith((".jpg", ".jpeg", ".png")):
            shutil.move(os.path.join(folderfiles, filename), "album")
        elif filename.endswith((".midi", ".mid")):
            shutil.move(os.path.join(folderfiles, filename), "song")

    shutil.rmtree(zip_directory)

    return {"message": "ZIP file extracted and files sorted into album and song directories."}


@app.get("/gallery/")
async def get_gallery(request: Request):

    if not os.path.exists("album"):
        os.makedirs("album")
    
    if not os.path.exists("song"):
        os.makedirs("song")

    album_dir = Path("album")
    song_dir = Path("song")

    base_url = str(request.base_url)

    audio_to_pic = {}
    if newest_json_path:
        try:
            with open(newest_json_path, 'r') as f:
                json_data = json.load(f)
                audio_to_pic = {entry["audio_file"]: entry["pic_name"] for entry in json_data}
        except Exception as e:
            return {"error": f"Failed to load JSON file: {e}"}

    gallery_files = [file.name for file in song_dir.glob("*.mid") if file.is_file()]

    filtered_gallery_files = [file for file in gallery_files if file in audio_to_pic]

    result = [
        {
            "id": index + 1,
            "cover": f"{base_url}album/{audio_to_pic.get(midi_file, '').split('.')[0]}.jpg" if audio_to_pic.get(midi_file) else None,
            "title": midi_file,
            "src": f"{base_url}song/{midi_file}",
        }
        for index, midi_file in enumerate(filtered_gallery_files)
    ]

    return result