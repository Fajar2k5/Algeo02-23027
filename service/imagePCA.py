from PIL import Image
import logging
import numpy as np
import os

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

IMAGE_SIZE = (64, 64)  # Image resize dimensions


class ImagePCA:
    def __init__(self, image_size=(64, 64), n_components=50):
        self.IMAGE_SIZE = image_size
        self.n_components = n_components
        self.files = None
        self.standardized_dataset = None
        self.mean_dataset = None
        self.eigenvectors = None
        self.projected_dataset = None

    def _process_image(self, image_path):
        """Helper function to process an image: resize and flatten."""
        try:
            with Image.open(image_path) as img:
                image_gray = img.convert("L")
                image_resized = image_gray.resize(self.IMAGE_SIZE)
                return np.array(image_resized).flatten()
        except Exception as e:
            logger.error(f"Failed to process image {image_path}: {str(e)}")
            return None

    def _progress_bar(self, current, total):
        """Helper function to show progress."""
        print(f"\rCurrent Progress {
              (current / total * 100):.2f}%", end="", flush=True)

    def process_dataset(self, dataset_name):
        """Process the dataset: read, resize, and flatten images."""
        logger.info(f"Processing Started for dataset '{dataset_name}'")
        dataset_path = os.path.join(os.path.dirname(
            __file__), "archive", "dataset", dataset_name)

        processed_images = []
        files = sorted(os.listdir(dataset_path))
        total_files = len(files)

        for i, image_filename in enumerate(files):
            self._progress_bar(i, total_files)

            file_path = os.path.join(dataset_path, image_filename)
            processed_image_array = self._process_image(file_path)

            if processed_image_array is not None:
                processed_images.append(processed_image_array)

        print("")  # Move to the next line after progress
        logger.info(f"Processing Ended for dataset '{dataset_name}'")
        return processed_images, np.array(files)

    def standardize_dataset(self, processed_dataset):
        """Standardize the dataset (zero-mean)."""
        logger.info(f"Standardizing dataset")
        mean_dataset = np.mean(processed_dataset, axis=0)
        standardized_dataset = [
            image - mean_dataset for image in processed_dataset]
        logger.info(f"Standardization completed")
        return standardized_dataset, mean_dataset

    def perform_svd(self, standardized_dataset):
        """Perform SVD to reduce dimensionality."""
        logger.info(f"SVD started")
        standardized_dataset = np.vstack(standardized_dataset)
        matrix_covariance = np.dot(
            standardized_dataset.T, standardized_dataset) / len(standardized_dataset)
        U, S, Ut = np.linalg.svd(matrix_covariance, full_matrices=False)
        eigenvectors = U[:, :self.n_components]

        projected_dataset = np.dot(standardized_dataset, eigenvectors)
        logger.info(f"SVD ended")
        return eigenvectors, projected_dataset

    def process_query_image(self, image_path):
        """Process a query image (resize and flatten)."""
        return self._process_image(image_path)

    def query_image(self, image_name, n_results=25):
        """Query the dataset with a new image and find the most similar ones."""
        logger.info(f"Querying image {image_name}")
        image_path = os.path.join(os.path.dirname(__file__), image_name)
        processed_image_array = self.process_query_image(image_path)

        if processed_image_array is None:
            return None, None

        # Project the image to the PCA space
        standardized_image = processed_image_array - self.mean_dataset
        projected_image = np.dot(standardized_image, self.eigenvectors)

        # Compute similarity (Euclidean distance) with every image in the dataset
        similarities = np.linalg.norm(
            self.projected_dataset - projected_image, axis=1)
        sorted_indices = np.argsort(similarities)

        # Get the top results
        similarities = similarities[sorted_indices][:n_results]
        files = self.files[sorted_indices][:n_results]

        logger.info(f"Querying image ended")
        return similarities, files

    def initialize_dataset(self, dataset_name):
        """Initialize the dataset: process, standardize, and perform SVD."""
        processed_dataset, self.files = self.process_dataset(dataset_name)
        self.standardized_dataset, self.mean_dataset = self.standardize_dataset(
            processed_dataset)
        self.eigenvectors, self.projected_dataset = self.perform_svd(
            self.standardized_dataset)


def main():
    """Main function to run the PCA on a dataset and query images."""
    dataset = ImagePCA()
    dataset.initialize_dataset("test")
    inp = input("Enter the image name: ")

    while inp != "exit":
        sorted_values, sorted_files = dataset.query_image(inp)
        if sorted_values is None:
            print("Error processing the image!")
        else:
            print(sorted_values)
            print("-----------------------------")
            print(sorted_files)
        inp = input("Enter the image name: ")


if __name__ == "__main__":
    main()
