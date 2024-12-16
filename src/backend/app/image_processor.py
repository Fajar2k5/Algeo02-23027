from PIL import Image
import numpy as np
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from scipy.sparse.linalg import svds  # Truncated SVD

IMAGE_SIZE = (64, 64)  # Image resize dimensions
N_COMPONENTS = 50  # Number of principal components to retain

image_names = []
image_files = []

def process_image(image_path):
    """Helper function to process an image: resize and flatten."""
    try:
        with Image.open(image_path) as img:
            img_gray = img.convert("L")
            img_resized = img_gray.resize(IMAGE_SIZE)
            return np.array(img_resized).flatten()
    except Exception as e:
        print(f"Error processing image {image_path}: {e}")
        return None

def process_dataset_concurrently(directory, max_workers=8):
    """Process the dataset concurrently using a thread pool."""
    global image_names, image_files
    image_files = []
    image_names = []
    processed_images = []
    path_to_title = {}

    # Collect all image files
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith((".jpg", ".png", ".jpeg")):
                file_path = os.path.join(root, file)
                image_files.append(file_path)
                path_to_title[file_path] = file

    # Process images in parallel
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_file = {executor.submit(process_image, file): file for file in image_files}
        for future in as_completed(future_to_file):
            result = future.result()
            if result is not None:
                processed_images.append(result)
                image_names.append(path_to_title[future_to_file[future]])

    return np.array(processed_images)

def standardize_dataset(processed_dataset):
    """Standardize the dataset (zero-mean)."""
    mean_dataset = np.mean(processed_dataset, axis=0)
    standardized_dataset = processed_dataset - mean_dataset
    return standardized_dataset, mean_dataset

def perform_truncated_svd(standardized_dataset, n_components):
    """Perform Truncated SVD to reduce dimensionality."""
    print("Performing truncated SVD...")
    # Compute only the top `n_components` singular values/vectors
    U, S, Vt = svds(standardized_dataset, k=n_components)
    eigenvectors = Vt.T  # Use right singular vectors (V)
    projected_dataset = np.dot(standardized_dataset, eigenvectors)
    return eigenvectors, projected_dataset

def process_query_image(image_path):
    """Process a query image (resize and flatten)."""
    return process_image(image_path)

def cosine_similarity(vec1, vec2):
    """Calculate cosine similarity between two vectors."""
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return np.dot(vec1, vec2) / (norm1 * norm2)

def query_image(query_image_path, eigenvectors, projected_dataset, mean_dataset):
    """Query the dataset with a new image and find the most similar ones."""
    processed_query = process_query_image(query_image_path)
    if processed_query is None:
        return None, None

    standardized_query = processed_query - mean_dataset
    projected_query = np.dot(standardized_query, eigenvectors)

    # Compute similarities (cosine similarity)
    similarities = np.array([
        cosine_similarity(projected_query, projected_dataset[i])
        for i in range(len(projected_dataset))
    ])
    sorted_indices = np.argsort(similarities)[::-1]  # Sort in descending order
    return similarities, sorted_indices

def initialize_dataset_concurrently(directory):
    """Initialize the dataset with concurrent processing."""
    processed_dataset = process_dataset_concurrently(directory)
    standardized_dataset, mean_dataset = standardize_dataset(processed_dataset)
    eigenvectors, projected_dataset = perform_truncated_svd(standardized_dataset, N_COMPONENTS)
    return eigenvectors, projected_dataset, mean_dataset

# Main Execution
if __name__ == "__main__":
    start_time = time.time()

    dataset_directory = "data_image"
    eigenvectors, projected_dataset, mean_dataset = initialize_dataset_concurrently(dataset_directory)

    query_image_path = "65.png"
    similarities, sorted_indices = query_image(query_image_path, eigenvectors, projected_dataset, mean_dataset)

    if similarities is not None:
        result = [
            (image_names[sorted_indices[i]], similarities[sorted_indices[i]])
            for i in range(min(20, len(sorted_indices)))
        ]
        print(result)

    end_time = time.time()
    print(f"Query completed in {end_time - start_time:.2f} seconds")
