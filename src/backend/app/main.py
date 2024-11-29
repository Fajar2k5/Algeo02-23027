import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import Request


app = FastAPI()

# Enable CORS for frontend communication
origins = ["http://localhost:5173"]  # Update with your frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_type = file.content_type

    if file_type not in ["image/png", "image/jpeg", "audio/mid", "application/json"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    directory = f"uploads/{file_type.split('/')[0]}"
    os.makedirs(directory, exist_ok=True)

    file_location = f"{directory}/{file.filename}"
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())

    if file_type == "application/json":
        return {"file_path": file_location}

#belum jadi anjay
async def gallery_mapper(tab: str):
    if tab == "Image":
        return "image"
    elif tab == "MIDI":
        return "audio"
    else:
        return None

@app.get("/gallery/{tab}")
async def get_gallery(tab: str, request: Request):
    base_url = str(request.base_url)
    if tab == "Image":
        return [
            {"id": 1, "cover": f"{base_url}uploads/image/Hu.Tao.full.3510928.jpg", "title": "Image Song 1"},
            {"id": 2, "cover": f"{base_url}uploads/image/nota_cat3pcs.jpg", "title": "Image Song 2"},
            {"id": 3, "cover": f"{base_url}uploads/image/image3.jpg", "title": "Image Song 3"},
            {"id": 4, "cover": f"{base_url}uploads/image/image4.jpg", "title": "Image Song 4"},
            {"id": 5, "cover": f"{base_url}uploads/image/image5.jpg", "title": "Image Song 5"},
            {"id": 6, "cover": f"{base_url}uploads/image/image6.jpg", "title": "Image Song 6"},
            {"id": 7, "cover": f"{base_url}uploads/image/image7.jpg", "title": "Image Song 7"},
            {"id": 8, "cover": f"{base_url}uploads/image/image8.jpg", "title": "Image Song 8"},
            {"id": 9, "cover": f"{base_url}uploads/image/image9.jpg", "title": "Image Song 9"},
         ]
    elif tab == "MIDI":
        return [
            {"id": 1, "cover": f"{base_url}uploads/audio/Sword Art Online II - IGNITE.mid", "title": "MIDI Song 1"},
            {"id": 2, "cover": None, "title": "MIDI Song 2"},
            {"id": 3, "cover": None, "title": "MIDI Song 3"},
            {"id": 4, "cover": None, "title": "MIDI Song 4"},
            {"id": 5, "cover": None, "title": "MIDI Song 5"},
            {"id": 6, "cover": None, "title": "MIDI Song 6"},
            {"id": 7, "cover": None, "title": "MIDI Song 7"},
        ]
    else:
        return []

