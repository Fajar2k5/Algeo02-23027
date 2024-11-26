from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import mido
import os
import json

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load MIDI database from JSON
def load_midi_database():
    try:
        with open('midi_database.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

# MIDI Feature Extraction
def extract_midi_features(midi_path):
    try:
        midi_file = mido.MidiFile(midi_path)
        
        # Extract key features
        features = {
            'tempo': 0,
            'time_signature': None,
            'key_signature': None,
            'track_count': len(midi_file.tracks),
            'total_duration': 0,
            'note_count': 0,
            'channels_used': set()
        }

        # Track tempo and time signature from first track
        for track in midi_file.tracks:
            for msg in track:
                if msg.type == 'set_tempo':
                    features['tempo'] = mido.bpm2tempo(msg.tempo)
                
                if msg.type == 'time_signature':
                    features['time_signature'] = f"{msg.numerator}/{msg.denominator}"
                
                if msg.type == 'note_on' and msg.velocity > 0:
                    features['note_count'] += 1
                    features['channels_used'].add(msg.channel)
        
        features['channels_used'] = list(features['channels_used'])
        
        return features
    except Exception as e:
        print(f"Error extracting MIDI features: {e}")
        return None

# Similarity comparison function
def compare_midi_features(file_features, db_features, threshold=0.7):
    similarity_score = 0
    total_checks = 0

    # Compare numerical features
    numerical_features = ['track_count', 'note_count']
    for feature in numerical_features:
        if abs(file_features[feature] - db_features[feature]) / db_features[feature] < 0.2:
            similarity_score += 1
        total_checks += 1

    # Compare categorical features
    categorical_features = ['time_signature', 'channels_used']
    for feature in categorical_features:
        if file_features[feature] == db_features[feature]:
            similarity_score += 1
        total_checks += 1

    # Calculate overall similarity
    overall_similarity = similarity_score / total_checks
    return overall_similarity * 100

@app.post("/recognize")
async def recognize_midi(midi_file: UploadFile = File(...)):
    try:
        # Save uploaded MIDI file
        midi_path = f"temp_{midi_file.filename}"
        with open(midi_path, "wb") as buffer:
            buffer.write(await midi_file.read())
        
        # Extract features of uploaded MIDI
        uploaded_features = extract_midi_features(midi_path)
        
        if not uploaded_features:
            raise HTTPException(status_code=400, detail="Could not extract MIDI features")
        
        # Load MIDI database
        midi_database = load_midi_database()
        
        # Find best match
        best_match = None
        best_similarity = 0
        
        for track in midi_database:
            similarity = compare_midi_features(uploaded_features, track['features'])
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = track
        
        # Clean up temporary file
        os.remove(midi_path)
        
        if best_match and best_similarity > 70:
            return {
                "title": best_match['title'],
                "composer": best_match['composer'],
                "genre": best_match['genre'],
                "confidence": round(best_similarity, 2)
            }
        else:
            return {
                "title": "Unknown",
                "composer": "Unknown",
                "genre": "Unknown",
                "confidence": 0
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)