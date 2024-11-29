"use client";

import { useState } from "react";

export default function UploadSection() {
  const [activeTab, setActiveTab] = useState<string | null>("MIDI");
  const [isDragging, setIsDragging] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

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
      setFileName(file.name);

      if (activeTab === "Image") {
        previewImage(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setFileName(file.name);

      if (activeTab === "Image") {
        previewImage(file);
      }
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
    setPreviewSrc(null);
    setFileName(null);
  };

  const handleRemoveImage = () => {
    setPreviewSrc(null);
    setFileName(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto bg-[#121212] p-2 rounded-2xl">
      <p className="text-white">{fileName ? `Filename: ${fileName}` : "Filename: -"}</p>
      <div className="flex justify-center space-x-1 mb-2">
        {["MIDI", "Image", "Mapper"].map((tab) => (
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
                  : undefined
              }
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className="cursor-pointer text-zinc-500 text-xs text-center px-2">
              {activeTab
                ? `Drop your ${activeTab.toLowerCase()} file here or click to upload`
                : "Select a file type above"}
            </label>
          </>
        )}
      </div>

      <button
        className={`mt-2 w-28 py-1 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-xs transition-colors duration-200 ${
          !activeTab ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={!activeTab}
      >
        Upload
      </button>
    </div>
  );
}
