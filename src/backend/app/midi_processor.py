from tqdm import tqdm
import time
import os
import numpy as np
import mido
import random
import concurrent.futures
import functools

@functools.lru_cache(maxsize=128)
def get_midi_notes(file_path):
    midi_data = mido.MidiFile(file_path)
    notes = []
    for track in midi_data.tracks:
        for msg in track:
            if msg.type == 'note_on' and msg.velocity > 0 and (msg.channel == 0 or msg.channel == 3):
                notes.append(msg.note)
    return notes

def shrink_atb_histogram(hist):
    hist = hist.astype(float)
    total = np.sum(hist)
    now = 0
    center = 0
    for i in range(128):
        now += hist[i]
        if now >= total / 2:
            center = i
            break
    hist /= total
    left = max(0, int(center) - 12)
    right = min(len(hist), int(center) + 12 + 1)
    reduced_hist = hist[left:right]

    padding_left = max(0, 12 - (int(center) - left))
    padding_right = max(0, 25 - len(reduced_hist) - padding_left)

    # Create a 25-length array
    final_array = np.concatenate((np.zeros(padding_left), reduced_hist, np.zeros(padding_right)))
    return final_array

def shrink_rtb_ftb_histogram(hist):
    hist = hist.astype(float)
    total = np.sum(hist)
    hist /= (total if total != 0 else 1)
    center = 128
    left = center - 12
    right = center + 12
    reduced_hist = np.zeros(25, dtype=float)
    for i in range(len(hist)):
        if i < left:
            reduced_hist[0] += hist[i]
        elif i > right:
            reduced_hist[-1] += hist[i]
        else:
            reduced_hist[i - left] += hist[i]
    return reduced_hist

def get_feature(notes, window_size=40, step=20):
    atb_arrays = []
    rtb_arrays = []
    ftb_arrays = []

    for i in range(0, len(notes), step):
        start = i
        end = start + window_size - 1
        if end >= len(notes):
            break
        current_windows = notes[start:end + 1]
        atb_hist = np.zeros(128, dtype=float)
        unique, counts = np.unique(current_windows, return_counts=True)
        atb_hist[unique] = counts
        atb_hist_norm = atb_hist / max(np.sum(atb_hist), 1)

        intervals = np.diff(current_windows)
        rtb_hist = np.zeros(255, dtype=float)
        unique_intervals, counts = np.unique(intervals + 127, return_counts=True)
        rtb_hist[unique_intervals] = counts
        rtb_hist_norm = rtb_hist / max(np.sum(rtb_hist), 1)

        first_note = notes[0]
        ftb_hist = np.zeros(255, dtype=float)
        ftb_intervals = [note - first_note for note in current_windows[1:]]
        unique_ftb, counts = np.unique(np.array(ftb_intervals) + 127, return_counts=True)
        ftb_hist[unique_ftb] = counts
        ftb_hist_norm = ftb_hist / max(np.sum(ftb_hist), 1)

        atb_arrays.append(shrink_atb_histogram(atb_hist_norm))
        rtb_arrays.append(shrink_rtb_ftb_histogram(rtb_hist_norm))
        ftb_arrays.append(shrink_rtb_ftb_histogram(ftb_hist_norm))

    # Convert lists of arrays into a single numpy array: shape (num_windows, 25)
    if len(atb_arrays) == 0:
        return np.empty((0,25)), np.empty((0,25)), np.empty((0,25))

    atb_feature_array = np.stack(atb_arrays, axis=0)
    rtb_feature_array = np.stack(rtb_arrays, axis=0)
    ftb_feature_array = np.stack(ftb_arrays, axis=0)
    return atb_feature_array, rtb_feature_array, ftb_feature_array

def process_single_midi_file(file_path):
    try:
        notes = get_midi_notes(file_path)
        features = get_feature(notes)
        return file_path, features
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None, None

def cosine_similarity(vec1, vec2):
    if np.all(vec1 == 0) or np.all(vec2 == 0):
        return 0.0
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def process_all_midi_files_concurrently(directory):
    preprocess_result = []
    midi_files = []
    path_to_title = {}
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".mid"):
                midi_files.append(os.path.join(root, file))
                path_to_title[os.path.join(root, file)] = file

    if not midi_files:
        print("No MIDI files found in the directory.")
        return [], []

    with concurrent.futures.ProcessPoolExecutor(max_workers=None) as executor:
        futures = {executor.submit(process_single_midi_file, midi_file): midi_file for midi_file in midi_files}
        for future in tqdm(concurrent.futures.as_completed(futures), total=len(midi_files), desc="Processing Database"):
            file_path, features = future.result()
            if file_path is not None and features is not None:
                preprocess_result.append((path_to_title[file_path], features[0], features[1], features[2]))

    return preprocess_result

def compute_similarity_for_feature(feature, queries):
    song_name, feature_ATB, feature_RTB, feature_FTB = feature
    query_ATB, query_RTB, query_FTB = queries
    max_similarity = 0.0

    # Ensure queries are arrays
    # Since we already have arrays, no change needed here.
    for i in range(len(feature_ATB)):
        # Random sampling from query
        max_idx = min(len(query_ATB), 10)
        for _ in range(max_idx):
            idx = random.randint(0, len(query_ATB) - 1)
            ATB_similarity = cosine_similarity(feature_ATB[i], query_ATB[idx])
            RTB_similarity = cosine_similarity(feature_RTB[i], query_RTB[idx])
            FTB_similarity = cosine_similarity(feature_FTB[i], query_FTB[idx])
            similarity_score = (ATB_similarity + RTB_similarity + FTB_similarity) / 3.0
            if similarity_score > max_similarity:
                max_similarity = similarity_score

    return (song_name, max_similarity)

def compare(features, queries):
    results = []
    with concurrent.futures.ProcessPoolExecutor(max_workers=None) as executor:
        futures = {
            executor.submit(compute_similarity_for_feature, feature, queries): feature
            for feature in features
        }

        for future in tqdm(concurrent.futures.as_completed(futures), total=len(features), desc="Comparing Query"):
            song_name, similarity_score = future.result()
            results.append((song_name, similarity_score))

    # Convert to np.array and sort by similarity score in descending order
    sorted_results = np.array(results, dtype=[('song_name', 'U100'), ('similarity_score', 'f4')])
    sorted_results = np.sort(sorted_results, order='similarity_score')[::-1]
    return sorted_results

def get_similarities(sorted_results, threshold=0.55):
    res = []
    for song_name, similarity_score in sorted_results:
        if similarity_score >= threshold:
            res.append((song_name, similarity_score))

    return res

# if __name__ == "__main__":
#     start_time = time.time()

#     # Directory containing MIDI files
#     directory_path = "temp_data/"

#     # Process MIDI files concurrently
#     preprocess_result = process_all_midi_files_concurrently(directory_path)

#     print("Database processed successfully.")
#     print(f"Pre process finished within {time.time() - start_time:.2f} seconds")
#     mid_time = time.time()

#     # Extract features for the query MIDI file
#     query_notes = get_midi_notes("temp_data/edited_fmttm.mid")
#     queries = get_feature(query_notes)

#     # Compare similarity in parallel and get sorted results (as numpy array)
#     sorted_similarity = compare(preprocess_result, queries)
#     result = get_similarities(sorted_similarity)

#     print("\nResults:")
#     for song_name, similarity_score in result:
#         print(f"{song_name}: {similarity_score:.4f}")

#     end_time = time.time()
#     print(f"\nQuery finished within {end_time - mid_time:.2f} seconds")
#     print(f"\nTotal processing time: {end_time - start_time:.2f} seconds")
