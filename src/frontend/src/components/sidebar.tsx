"use client";

import { useState } from "react";
import UploadSection from "./uploadbox";
import placeHolder from "../assets/placeholder.png";
import axios from "axios";

export interface Song {
  id: number;
  cover: string | null;
  title: string;
  src: string;
}

interface SidebarProps {
  onUploadSuccess: () => void; // Callback to notify parent
  onSelectedSong: (song: Song) => void; // Callback to notify parent
  activeTab: "Image" | "MIDI" | null;
  galleryData : Song[];
  onQueryResult: (data: Song[]) => void;
}


const Sidebar: React.FC<SidebarProps> = ({ onUploadSuccess,activeTab, onQueryResult }) => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(placeHolder);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [queryFile, setQueryFile] = useState<File | null>(null);
  const [queryTime, setQueryTime] = useState<number | null>(null);
  
  const handleQuery = async () => {
    if (activeTab === "Image" && queryFile !== null) {
      try {
        const formData = new FormData();
        formData.append("file", queryFile);

        const response = await axios.post("http://127.0.0.1:8000/image-query/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        const { result, time_taken } = response.data;
        alert("Image query success!");
        onQueryResult(result);
        setQueryTime(time_taken);
      } catch (error) {
        console.error("Error querying image:", error);
        setQueryTime(null);
      }
    } else if (activeTab === "MIDI" && queryFile !== null) {
      try {
        const formData = new FormData();
        formData.append("file", queryFile);

        const response = await axios.post("http://127.0.0.1:8000/midi-query/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        const { result, time_taken } = response.data;
        alert("MIDI query success!");
        onQueryResult(result);
        setQueryTime(time_taken);
      } catch (error) {
        console.error("Error querying MIDI:", error);
        setQueryTime(null);
      }
    } else {
      console.error("Invalid active tab:", activeTab);
    }
  };

  const handlePreviewChange = (src: string | null) => {
    setPreviewSrc(src || placeHolder);
  };

  const handleDeletePreview = () => {
    setPreviewSrc(placeHolder);
    setCurrentFileName(null);
    setQueryFile(null);
    setQueryTime(null);
  };

  const handleMidiClick = () => {
    console.log("MIDI placeholder clicked");
  };

  const handleFileNameChange = (name: string | null) => {
    setCurrentFileName(name);
  };

  const isMidiPreview = previewSrc === "/midi_placeholder.png";

  const currentQueryText = previewSrc && currentFileName 
    ? `Current Query: ${currentFileName}` 
    : "Current Query: -";
  
  const currentQueryTime = queryTime !== null
    ? `Time Elapsed: ${queryTime.toFixed(2)} seconds`
    : "Time Elapsed: -";
  
  return (
    <section className="bg-[#121212] rounded-xl h-full">
      <div className="flex flex-col h-full">
        <div className="p-4 flex justify-center items-center relative">
          <div className="w-56 h-48 bg-[#1A1A1A] rounded-lg flex justify-center items-center overflow-hidden relative">
            {previewSrc ? (
              <>
                {isMidiPreview ? (
                  <div
                    onClick={handleMidiClick}
                    className="cursor-pointer relative w-full h-full"
                  >
                    <img
                      src={previewSrc || placeHolder}
                      alt="MIDI Placeholder"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreview();
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <>
                    <img
                      src={previewSrc}
                      alt="Uploaded Preview"
                      className="w-full h-full object-cover"
                    />
                    {previewSrc !== placeHolder && (
                    <button
                      onClick={handleDeletePreview}
                      className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full"
                    >
                      Delete
                    </button>)}
                  </>
                )}
              </>
            ) : (
              <img
                src="/placeholder.png"
                alt="Uploaded Preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-white text-xs font-semibold mb-2">{currentQueryText}</p>
          <p className="text-white text-xs font-semibold mb-2">{currentQueryTime}</p>
        </div>

        <div className="flex flex-col items-center">
          <button
            className={`mt-4 w-32 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-xs transition-colors duration-200 ${
              !activeTab || previewSrc == placeHolder ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleQuery}
            disabled={previewSrc == placeHolder || activeTab === null}
          >
            Query
          </button>
        </div>

        <div className="w-full rounded-xl p-4 mt-2">
          <UploadSection
            onUploadSuccess={onUploadSuccess}
            onPreviewChange={handlePreviewChange}
            onFileNameChange={handleFileNameChange}
            queryFile={(file: File | null) => setQueryFile(file)}
          />
        </div>
      </div>
    </section>
  );
};

export default Sidebar;
