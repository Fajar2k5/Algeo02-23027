import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for frontend communication
origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_type = file.content_type

    # print(f"File received: {file.filename}")
    # print(f"Content type: {file.content_type}")

    if file_type not in ["image/png", "image/jpeg", "audio/mid", "application/json"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    directory = f"uploads/{file_type.split('/')[0]}"

    os.makedirs(directory, exist_ok=True)

    file_location = f"{directory}/{file.filename}"
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())

    return {"filename": file.filename, "type": file_type, "location": file_location}
