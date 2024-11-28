import pretty_midi
import heapq
import time
import os
import numpy as np
import random


def open_midi_file(file_path):
    return pretty_midi.PrettyMIDI(file_path)


def get_events(midi_data):
    events = []
    for instrument in midi_data.instruments:
        if (instrument.program != 0 and instrument.program != 4):
            continue
        
        for note in instrument.notes:
            start_tick = midi_data.time_to_tick(note.start)
            end_tick = midi_data.time_to_tick(note.end)
            events.append({
                "start_tick": start_tick,
                "velocity": note.velocity,
                "pitch": note.pitch,
                "end_tick": end_tick
            })
        # break
    #  priority_queue = []

    # # Initialize the priority queue with the first note of every instrument
    # for instrument_index, instrument in enumerate(midi_data.instruments):
    #     if instrument.notes:
    #         first_note = instrument.notes[0]
    #         heapq.heappush(priority_queue, (
    #             first_note.start,
    #             instrument_index,
    #             0,  # Note index within the instrument
    #             first_note
    #         ))

    # # Process the priority queue
    # while priority_queue:
    #     # Get the note with the smallest start_tick
    #     start_time, instrument_index, note_index, note = heapq.heappop(
    #         priority_queue)

    #     # Convert start and end times to ticks
    #     start_tick = midi_data.time_to_tick(note.start)
    #     end_tick = midi_data.time_to_tick(note.end)

    #     # Add the note's event to the result list
    #     events.append({
    #         "start_tick": start_tick,
    #         "velocity": note.velocity,
    #         "pitch": note.pitch,
    #         "end_tick": end_tick
    #     })

    #     # Push the next note from the same instrument, if it exists
    #     next_note_index = note_index + 1
    #     if next_note_index < len(midi_data.instruments[instrument_index].notes):
    #         next_note = midi_data.instruments[instrument_index].notes[next_note_index]
    #         heapq.heappush(priority_queue, (
    #             next_note.start,
    #             instrument_index,
    #             next_note_index,
    #             next_note
    #         ))

    return events


def fuzzy_histogram(hist):
    fuzzy = hist[:]
    for i in range(1, len(hist) - 1):
        fuzzy[i] *= 2
        fuzzy[i] += hist[i - 1] + hist[i + 1]
    return fuzzy


def shrink_atb_histogram(hist):
    hist = fuzzy_histogram(hist)

    # Compute the mean (center) of the histogram
    total = sum(hist)
    mean_bin = sum(i * hist[i] for i in range(len(hist))
                   ) / total if total > 0 else len(hist) // 2

    # Define range around the mean
    left = max(0, int(mean_bin) - 12)
    right = min(len(hist), int(mean_bin) + 12 + 1)

    # Extract values in the range and normalize
    reduced_hist = hist[left:right]

    # Ensure 25 bins (pad with zeros if necessary)
    padding_left = max(0, 12 - (int(mean_bin) - left))
    padding_right = max(0, 25 - len(reduced_hist) - padding_left)
    return [0] * padding_left + reduced_hist + [0] * padding_right


def shrink_rtb_ftb_histogram(hist):
    hist = fuzzy_histogram(hist)

    # Define the center (128 in the shifted representation)
    center = 128
    left = center - 12
    right = center + 12

    # Initialize reduced histogram
    reduced_hist = [0] * 25

    for i in range(len(hist)):
        if i < left:
            reduced_hist[0] += hist[i]  # Merge into leftmost bin (-12)
        elif i > right:
            reduced_hist[-1] += hist[i]  # Merge into rightmost bin (+12)
        else:
            reduced_hist[i - left] += hist[i]  # Map within range

    # Normalize the reduced histogram
    return reduced_hist


def get_feature(events, window_size=50, step=20):
    # Initialize histograms
    ATB_hist = [0 for _ in range(128)]
    RTB_hist = [0 for _ in range(256)]
    FTB_hist = [0 for _ in range(256)]

    normalized_ATB_list = []
    normalized_RTB_list = []
    normalized_FTB_list = []

    # Populate initial window
    for i in range(min(window_size, len(events))):
        ATB_hist[events[i]["pitch"]] += 1
        if i > 0:
            RTB_hist[events[i]["pitch"] - events[i - 1]["pitch"] + 128] += 1
            FTB_hist[events[i]["pitch"] - events[0]["pitch"] + 128] += 1

    # Sliding window processing
    for i in range(window_size, len(events), step):
        # Shrink and normalize histograms for the current window
        normalized_ATB_list.append(shrink_atb_histogram(ATB_hist))
        normalized_RTB_list.append(shrink_rtb_ftb_histogram(RTB_hist))
        normalized_FTB_list.append(shrink_rtb_ftb_histogram(FTB_hist))

        # Break if the next window exceeds the event list
        if i + step >= len(events):
            break

        # Update histograms for the sliding window
        for j in range(step):
            # Add new notes to histograms
            ATB_hist[events[i + j]["pitch"]] += 1
            RTB_hist[events[i + j]["pitch"] -
                     events[i + j - 1]["pitch"] + 128] += 1
            FTB_hist[events[i + j]["pitch"] - events[i]["pitch"] + 128] += 1

            # Remove old notes from histograms
            ATB_hist[events[i - window_size + j]["pitch"]] -= 1
            if i - window_size + j - 1 >= 0:
                RTB_hist[events[i - window_size + j]["pitch"] -
                         events[i - window_size + j - 1]["pitch"] + 128] -= 1
                FTB_hist[events[i - window_size + j]["pitch"] -
                         events[i - window_size]["pitch"] + 128] -= 1

    return normalized_ATB_list, normalized_RTB_list, normalized_FTB_list


def process_all_midi_files(directory):
    song_features = []
    song_list = []

    print("Processing database . . .")

    # Start the timer
    start_time = time.time()

    # List all `.mid` files in the directory
    midi_files = [f for f in os.listdir(directory) if f.endswith('.mid')]

    if not midi_files:
        print("No MIDI files found in the directory.")
        return

    for midi_file in midi_files:
        song_list.append(midi_file)
        print(f"Processing {midi_file} . . .")

        # Load and process the MIDI file
        midi_path = os.path.join(directory, midi_file)
        midi_data = open_midi_file(midi_path)
        events = get_events(midi_data)
        song_features.append(get_feature(events))

    # End the timer
    end_time = time.time()

    print("Database processed successfully.")
    print(f"Total processing time: {end_time - start_time:.2f} seconds")
    print(f"Processed {len(midi_files)} MIDI files.")

    return song_list, song_features


def cosine_similarity(vec1, vec2):
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)

    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))


def compare(features, queries):
    similarity = []
    for feature in features:
        max_similarity = 0.0

        feature_ATB, feature_RTB, feature_FTB = feature
        query_ATB, query_RTB, query_FTB = queries

        for i in range(len(feature_ATB)):
            for j in range(min(len(query_ATB), 2)):
                idx = random.randint(0, len(query_ATB) - 1)

                ATB_similarity = cosine_similarity(
                    feature_ATB[i], query_ATB[idx])
                RTB_similarity = cosine_similarity(
                    feature_RTB[i], query_RTB[idx])
                FTB_similarity = cosine_similarity(
                    feature_FTB[i], query_FTB[idx])

                similarity_score = 0.5*ATB_similarity + 0.2*RTB_similarity + 0.3*FTB_similarity
                max_similarity = max(max_similarity, similarity_score)

        similarity.append(max_similarity)
    return similarity


directory_path = "data"  # Replace with the path to your MIDI files folder
song_list, features = process_all_midi_files(directory_path)
queries = get_feature(get_events(open_midi_file("data/edited_fmttm.mid")))


print("comparing similarity . . .")
start_time = time.time()

similarity = compare(features, queries)
for i in range(len(similarity)):
    print(f"{song_list[i]}: {similarity[i]:.2f}%")

end_time = time.time()
print(f"Total processing time: {end_time - start_time:.2f} seconds")
