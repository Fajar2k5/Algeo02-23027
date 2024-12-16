import tensorflow as tf
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH
import time
from mido import Message, MidiFile, MidiTrack, bpm2tempo, second2tick

def save_note_events_to_midi(note_events, output_file, bpm=120):
    midi = MidiFile()
    track = MidiTrack()
    midi.tracks.append(track)

    # Set the tempo
    tempo = bpm2tempo(bpm)  # Convert BPM to microseconds per beat
    #track.append(Message('set_tempo', tempo=tempo))

    ticks_per_beat = midi.ticks_per_beat
    print(f"Ticks per beat: {ticks_per_beat}")
    last_tick = 0

    # Process each note event
    note_events = sorted(note_events, key=lambda x: x[0])
    events = []

    for start_time, end_time, pitch, velocity, _ in note_events:
        # Convert times to ticks
        start_tick = int(second2tick(start_time, ticks_per_beat, tempo))
        end_tick = int(second2tick(end_time, ticks_per_beat, tempo))

        events.append((start_tick, int(pitch), int(velocity*127), 1))
        events.append((end_tick, int(pitch), 0, 0))


    # Save the MIDI file
    new_events = sorted(events, key=lambda x: x[0])
    # Add the events to the MIDI track
    for tick, pitch, velocity, on in new_events:
        time_delta = tick - last_tick
        last_tick = tick
        track.append(Message('note_on' if on else 'note_off', note=pitch, velocity=velocity, time=time_delta))

    midi.save(output_file)
    print(f"Saved MIDI to {output_file}")
