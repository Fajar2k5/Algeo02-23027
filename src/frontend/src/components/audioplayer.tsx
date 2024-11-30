import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { Song } from "../app/App"; // Ensure the import path is correct

interface AudioPlayerProps {
  selectedSong: Song | null;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ selectedSong }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Play the selected song automatically when it's updated
  useEffect(() => {
    if (audioRef.current && selectedSong) {
      audioRef.current.src = selectedSong.src; // Set the audio source
      audioRef.current.play(); // Play the audio
      setIsPlaying(true); // Update UI state to playing
    }
  }, [selectedSong]); // Run effect when selectedSong changes

  // Toggle play/pause state
  const playPauseHandler = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying); // Toggle the play state
    }
  };

  return (
    <div className="flex items-center justify-between bg-black text-white p-4 rounded-lg">
      <div className="flex items-center space-x-4">
        <img
          src={selectedSong?.cover || "/default-cover.jpg"}
          alt="Album Cover"
          className="w-12 h-12 rounded-lg"
        />
        <div>
          <p className="text-sm font-bold">
            {selectedSong?.title || "No Song Selected"}
          </p>
        </div>
      </div>

      <div className="flex items-center">
        <button onClick={playPauseHandler} className="rounded-full hover:bg-white">
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white hover:text-black" />
          ) : (
            <Play className="w-4 h-4 text-white hover:text-black" />
          )}
        </button>
      </div>

      <audio ref={audioRef} />
    </div>
  );
};

export default AudioPlayer;
