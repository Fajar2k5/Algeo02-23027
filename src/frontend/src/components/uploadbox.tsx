"use client";

import { useState } from "react";
import axios from "axios";

interface UploadSectionProps {
  onUploadSuccess: (uploadedUrl?: string) => void;
  onPreviewChange: (src: string | null) => void;
  onFileNameChange: (name: string | null) => void; 
}

const UploadSection: React.FC<UploadSectionProps> = ({ onUploadSuccess, onPreviewChange, onFileNameChange }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localPreviewSrc, setLocalPreviewSrc] = useState<string | null>(null); // Local preview only
  const [localFileName, setLocalFileName] = useState<string | null>(null);     // Local filename only
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
      setError(null);
      handleFileSelection(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setError(null);
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);

    if (file.type === "application/x-zip-compressed") {
      setLocalFileName(file.name);
      // No preview for zip
      setLocalPreviewSrc(null);
    } else if (file.type === "application/json") {
      setLocalFileName(file.name);
      setLocalPreviewSrc(null);
    } else if (file.type.startsWith("image/")) {
      previewImage(file);
    } else if (file.type === "audio/midi" || file.type === "audio/mid") {
      setLocalFileName(file.name);
      setLocalPreviewSrc(null);
    } else {
      setError("Unsupported file type");
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
      onUploadSuccess(response.data.url);
      setLocalFileName(null);
      setLocalPreviewSrc(null);
      if (activeTab === "Image" && localPreviewSrc) {
        onPreviewChange(localPreviewSrc); 
        onFileNameChange(localFileName);
      } else if (activeTab === "MIDI") {
        // For MIDI, use a default placeholder icon after upload
        onPreviewChange("/midi_placeholder.png");
        onFileNameChange(localFileName);
      }else if (activeTab === "Mapper") {
        // For Mapper, use a default placeholder icon after upload
        setMapperName(localFileName);
        onPreviewChange(null);
      }else if (activeTab === "Dataset") {
        // For Dataset, use a default placeholder icon after upload
        setDatasetName(localFileName);
        onPreviewChange(null);
      }else {
        // For other file types, no preview in sidebar
        onPreviewChange(null);
        onFileNameChange(localFileName);
      }

      // Reset local states after successful upload
      setSelectedFile(null);
      // Note: We do NOT call onPreviewChange(null) or onFileNameChange(null) here,
      // because the sidebar should keep showing the uploaded file.

    } catch (error) {
      console.error("Upload failed:", error);
      setError("File upload failed!");
    }
  };

  const previewImage = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        setLocalPreviewSrc(src);
        setLocalFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTabClick = (tab: string) => {
    setActiveTab((prevTab) => (prevTab === tab ? null : tab));
    setLocalPreviewSrc(null);
    setLocalFileName(null);
    setSelectedFile(null);
  };

  const handleRemoveImage = () => {
    setLocalPreviewSrc(null);
    setLocalFileName(null);
    setSelectedFile(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto bg-[#121212] p-4 rounded-2xl">
      <div className="flex flex-row items-start mb-4 space-x-8">
        <div className="flex flex-col items-center">
          <p className="text-white text-xs mb-1">Dataset:</p>
          <p className="text-white text-xs font-semibold overflow-hidden whitespace-nowrap text-ellipsis">
            {datasetName || '-'}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-white text-xs mb-1">Filename:</p>
          <p className="text-white text-xs font-semibold overflow-hidden whitespace-nowrap text-ellipsis">
            {localFileName || '-'}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-white text-xs mb-1">Mapper:</p>
          <p className="text-white text-xs font-semibold overflow-hidden whitespace-nowrap text-ellipsis">
            {mapperName || '-'}
          </p>
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
        className={`w-64 h-16 rounded-lg bg-[#1A1A1A] border border-zinc-800 flex items-center justify-center transition-colors duration-200 ${
          isDragging ? "border-zinc-700 bg-zinc-800/50" : ""
        }`}
      >
        {activeTab === "Image" && localPreviewSrc ? (
          <div className="relative w-full h-full">
            <img
              src={localPreviewSrc}
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
        ) : activeTab ? (
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
              {`Drop your ${activeTab.toLowerCase()} file here or click to upload`}
            </label>
          </>
        ) : (
          <p className="text-zinc-500 text-xs text-center px-2">
            Select a file type above
          </p>
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
