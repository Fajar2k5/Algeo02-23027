"use client";

import { useState } from "react";
import axios from "axios";

interface UploadSectionProps {
  onUploadSuccess: () => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onUploadSuccess }) => {
  const [activeTab, setActiveTab] = useState<string | null>("MIDI");
  const [isDragging, setIsDragging] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [mapperName, setMapperName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setError(null); // Reset error

      if (file.type === "application/x-zip-compressed") {
        // If it's a ZIP file, update the dataset name
        setDatasetName(file.name);
        setSelectedFile(file);
      } else if (file.type === "application/json") {
        // If it's a JSON file, update the mapper name
        setMapperName(file.name);
        setSelectedFile(file);
      } else if (file.type.startsWith("image/")) {
        // For image files, set the file name and preview image
        setFileName(file.name);
        setSelectedFile(file);
        previewImage(file);
      } else {
        setError("Unsupported file type");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setError(null); // Reset error

      if (file.type === "application/x-zip-compressed") {
        setDatasetName(file.name); // Update dataset name for ZIP file
        setSelectedFile(file);
      } else if (file.type === "application/json") {
        setMapperName(file.name); // Update mapper name for JSON file
        setSelectedFile(file);
      } else if (file.type.startsWith("image/")) {
        setFileName(file.name); // Update file name for image files
        setSelectedFile(file);
        previewImage(file);
      } else {
        setError("Unsupported file type");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("No file selected!");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:8000/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Upload success:", response.data);
      alert("File uploaded successfully!");

      onUploadSuccess();

      // Reset states after successful upload, except dataset and mapper names
      setFileName(null);
      setPreviewSrc(null);
      setSelectedFile(null);
    } catch (error) {
      console.error("Upload failed:", error);
      setError("File upload failed!");
    }
  };

  const previewImage = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTabClick = (tab: string) => {
    setActiveTab((prevTab) => (prevTab === tab ? null : tab));

    // Reset only the file-specific states when switching tabs
    setPreviewSrc(null);
    setFileName(null);
    setSelectedFile(null);

    // Keep the dataset and mapper names as they are
  };

  const handleRemoveImage = () => {
    setPreviewSrc(null);
    setFileName(null);
    setSelectedFile(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto bg-[#121212] p-4 rounded-2xl">
      <div className="flex flex-row items-start mb-4 space-x-8">
        <div className="flex flex-col items-center">
          <p className="text-white text-xs mb-1">Dataset:</p>
          <p className="text-white text-xs font-semibold">{datasetName || '-'}</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-white text-xs mb-1">Filename:</p>
          <p className="text-white text-xs font-semibold">{fileName || '-'}</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-white text-xs mb-1">Mapper:</p>
          <p className="text-white text-xs font-semibold">{mapperName || '-'}</p>
        </div>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}

      <div className="flex justify-center space-x-1 mb-4">
        {["MIDI", "Image", "Mapper", "Dataset"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`px-3 py-1 rounded-full text-xs w-16 text-center ${
              activeTab === tab
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-48 aspect-square rounded-lg bg-[#1A1A1A] border border-zinc-800 flex items-center justify-center transition-colors duration-200 ${
          isDragging ? "border-zinc-700 bg-zinc-800/50" : ""
        }`}
      >
        {activeTab === "Image" && previewSrc ? (
          <div className="relative w-full h-full">
            <img
              src={previewSrc}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept={
                activeTab === "MIDI"
                  ? ".midi,.mid"
                  : activeTab === "Image"
                  ? "image/*"
                  : activeTab === "Mapper"
                  ? ".json"
                  : activeTab === "Dataset"
                  ? "application/x-zip-compressed"
                  : undefined
              }
              onChange={handleFileChange}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-zinc-500 text-xs text-center px-2"
            >
              {activeTab
                ? `Drop your ${activeTab.toLowerCase()} file here or click to upload`
                : "Select a file type above"}
            </label>
          </>
        )}
      </div>

      <button
        onClick={handleUpload}
        className={`mt-4 w-32 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-xs transition-colors duration-200 ${
          !activeTab || !selectedFile ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={!activeTab || !selectedFile}
      >
        Upload
      </button>
    </div>
  );
};

export default UploadSection;
