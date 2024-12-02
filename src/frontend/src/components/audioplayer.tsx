import React from "react";
import { Song } from "./gallery"; // Adjust the import path as needed

interface AudioPlayerProps {
  selectedSong: Song | null;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ selectedSong }) => {
  return (
    <div className="p-4 bg-[#1A1A1A] flex items-center justify-center">
      {selectedSong ? (
        <div className="flex items-center space-x-4">
          <img
            src={selectedSong.cover || "https://via.placeholder.com/50"}
            alt={selectedSong.title}
            className="w-12 h-12 object-cover rounded-full"
          />
          <div>
            <p className="text-white">{selectedSong.title}</p>
            {/* Add audio controls */}
            <audio controls src={selectedSong.src} className="w-full mt-2">
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      ) : (
        <p className="text-zinc-400">No song selected</p>
      )}
    </div>
  );
};

export default AudioPlayer;
