import os
import time
import sounddevice as sd
from scipy.io.wavfile import write
from basic_pitch.inference import predict
from audio_converter import save_note_events_to_midi
from basic_pitch import ICASSP_2022_MODEL_PATH


if __name__ == "__main__":
    # Parameters q
    input_wav = ""
    output_midi = "output.mid"
    record_duration = 15  # Duration in seconds

    # Convert recorded audio to MID

    start_time = time.perf_counter()

    model_output, midi_data, note_events = predict(
        output_wav,
        model_or_model_path=ICASSP_2022_MODEL_PATH,
        onset_threshold=0.6,
        frame_threshold=0.3,
        minimum_note_length=0.5
    )

    file_note_events = note_events;
    # Filter out low-confidence notes
    filtered_events = [note for note in file_note_events if note[3] > 0.25]
    # Save filtered note events to MIDI
    save_note_events_to_midi(filtered_events, output_midi)
