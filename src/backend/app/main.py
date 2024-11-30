import os
import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/album", StaticFiles(directory="album"), name="album")
app.mount("/song", StaticFiles(directory="song"), name="song")

newest_json_path = None


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    global newest_json_path

    file_type = file.content_type

    if file_type not in ["image/png", "image/jpeg", "audio/mid", "application/json"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    directory = f"uploads/{'album' if file_type.startswith('image') else 'song' if file_type == 'audio/mid' else 'application'}"
    os.makedirs(directory, exist_ok=True)

    file_location = f"{directory}/{file.filename}"
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())

    if file_type == "application/json":
        newest_json_path = file_location  
        return {"file_path": file_location, "message": "JSON file uploaded and set as the newest."}

    return {"file_path": file_location, "message": "File uploaded successfully."}


@app.get("/gallery/{tab}")
async def get_gallery(tab: str, request: Request):
    global newest_json_path

    if not newest_json_path or not os.path.exists(newest_json_path):
        raise HTTPException(status_code=404, detail="No JSON file uploaded yet.")

    base_url = str(request.base_url)

    with open(newest_json_path, "r") as json_file:
        songs_data = json.load(json_file)

    if tab == "Image":
        return [
            {
                "id": index + 1,
                "cover": f"{base_url}album/{song['pic_name']}",
                "title": song["audio_file"].split(".")[0], 
            }
            for index, song in enumerate(songs_data)
        ]
    elif tab == "MIDI":
        return [
            {
                "id": index + 1,
                "cover": f"{base_url}album/{song['pic_name']}" if os.path.exists(f"uploads/album/{song['pic_name']}") else None,
                "title": song["audio_file"],
            }
            for index, song in enumerate(songs_data)
        ]

    return {"error": "Invalid tab specified."}
