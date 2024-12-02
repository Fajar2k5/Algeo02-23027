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
            newest_json_path = file_location
            return {"file_path": file_location, "message": "JSON file uploaded and set as the newest."}
        
        return {"file_path": file_location, "message": "File uploaded successfully."}

    zip_directory = f"temp_{file.filename}_extracted"
    os.makedirs(zip_directory, exist_ok=True)

    with zipfile.ZipFile(file.file, 'r') as zip_ref:
        zip_ref.extractall(zip_directory)

    album_directory = "album"
    song_directory = "song"
    os.makedirs(album_directory, exist_ok=True)
    os.makedirs(song_directory, exist_ok=True)

    extracted_files = os.listdir(zip_directory)
    folderfiles = os.path.join(zip_directory, extracted_files[0])
    print(f"Extracted files: {folderfiles}")

    # Handle extracted files
    for filename in os.listdir(folderfiles):
        if filename.endswith(".jpg") or filename.endswith(".jpeg") or filename.endswith(".png"):
            shutil.move(os.path.join(folderfiles, filename), album_directory)
        elif filename.endswith(".midi") or filename.endswith(".mid"):
            shutil.move(os.path.join(folderfiles, filename), song_directory)
    

    shutil.rmtree(zip_directory)

    return {"message": "ZIP file extracted and files sorted into album and song directories."}

@app.get("/gallery/{tab}")
async def get_gallery(tab: str, request: Request):
    album_dir = Path("album")
    song_dir = Path("song")
    
    if not album_dir.exists() or not song_dir.exists():
        raise HTTPException(status_code=404, detail="Required directories do not exist.")
    
    base_url = str(request.base_url)

    if tab == "Image":
        image_files = [file.name for file in album_dir.glob("*") if file.is_file()]
        return [
            {
                "id": index + 1,
                "cover": f"{base_url}album/{image_file}",
                "title": image_file.split(".")[0],
            }
            for index, image_file in enumerate(image_files)
        ]
    
    elif tab == "MIDI":
        midi_files = [file.name for file in song_dir.glob("*.mid") if file.is_file()]
        return [
            {
                "id": index + 1,
                "cover": f"{base_url}album/{midi_file.split('.')[0]}.jpg" if os.path.exists(f"album/{midi_file.split('.')[0]}.jpg") else None,
                "title": midi_file,
                "src": f"{base_url}song/{midi_file}"
            }
            for index, midi_file in enumerate(midi_files)
        ]
    
    return {"error": "Invalid tab specified."}