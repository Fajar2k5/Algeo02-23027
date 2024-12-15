"use client";

import { useState } from "react";
import UploadSection from "./uploadbox";
import ikuyoImage from "../assets/ikuyokita.png";

export interface Song {
  id: number;
  cover: string | null;
  title: string;
  src: string;
}

interface SidebarProps {
  onUploadSuccess: () => void; // Callback to notify parent
  onSelectedSong: (song: Song) => void; // Callback to notify parent
}

const Sidebar: React.FC<SidebarProps> = ({ onUploadSuccess }) => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(ikuyoImage);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  const handlePreviewChange = (src: string | null) => {
    setPreviewSrc(src || ikuyoImage);
  };

  const handleDeletePreview = () => {
    setPreviewSrc(ikuyoImage);
    setCurrentFileName(null);
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

  return (
    <section className="bg-[#121212] rounded-xl h-full">
      <div className="flex flex-col h-full">
        <div className="p-4 flex justify-center items-center relative">
          <div className="w-48 h-48 bg-[#1A1A1A] rounded-lg flex justify-center items-center overflow-hidden relative">
            {previewSrc ? (
              <>
                {isMidiPreview ? (
                  <div
                    onClick={handleMidiClick}
                    className="cursor-pointer relative w-full h-full"
                  >
                    <img
                      src={previewSrc || ikuyoImage}
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
                    {previewSrc !== ikuyoImage && (
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
        </div>

        <div className="flex flex-col items-center">
          <button
            className="w-32 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-xs transition-colors duration-200"
            onClick={() => console.log("Query button clicked")}
          >
            Query
          </button>
        </div>

        <div className="w-full rounded-xl p-4 mt-2">
          <UploadSection
            onUploadSuccess={onUploadSuccess}
            onPreviewChange={handlePreviewChange}
            onFileNameChange={handleFileNameChange}
          />
        </div>
      </div>
    </section>
  );
};

export default Sidebar;
