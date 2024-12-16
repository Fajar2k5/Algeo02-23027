import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";
import { Song } from "./gallery";

declare global {
  interface Window {
    Tone: typeof Tone;
  }
}

interface AudioPlayerProps {
  selectedSong: Song | null;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ selectedSong }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [midiData, setMidiData] = useState<Midi | null>(null);
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const synth = useRef<Tone.PolySynth | null>(null);
  const gainNode = useRef<Tone.Gain | null>(null);
  const scheduledEvents = useRef<number[]>([]);
  const duration = useRef<number>(0);
  const lastVolume = useRef(volume);
  const progressInterval = useRef<number | null>(null);
  const activeNotes = useRef<Set<string>>(new Set());
  const isLoadingMidi = useRef(false);
  const lastSeekTime = useRef<number>(0);
  const seekDebounceTimeout = useRef<number | null>(null);

  // Initialize
  useEffect(() => {
    gainNode.current = new Tone.Gain(1).toDestination();
    synth.current = new Tone.PolySynth().connect(gainNode.current);

    return () => {
      if (synth.current) {
        synth.current.dispose();
      }
      if (gainNode.current) {
        gainNode.current.dispose();
      }
    };
  }, []);

  const forceStopAllNotes = () => {
    if (synth.current) {
      synth.current.releaseAll();
      activeNotes.current.forEach(note => {
        synth.current?.triggerRelease(note);
      });
      activeNotes.current.clear();
    }
  };

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      if (isPlaying && !isDraggingProgress) {
        setCurrentTime(Tone.getTransport().seconds);
      }
    };

    if (isPlaying) {
      progressInterval.current = window.setInterval(updateTime, 16) as number;
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, isDraggingProgress]);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle volume changes
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    lastVolume.current = newVolume;
    
    if (gainNode.current) {
      const gainValue = isPlaying ? newVolume / 100 : 0;
      gainNode.current.gain.rampTo(gainValue, 0.1);
    }
  };

  // Function to stop all active notes
  const cleanupCurrentPlayback = () => {
    const transport = Tone.getTransport();
    
    // Cancel all scheduled events
    transport.cancel(0);
    scheduledEvents.current.forEach(id => {
      transport.clear(id);
    });
    scheduledEvents.current = [];
    
    transport.stop();
    transport.position = 0;
    
    forceStopAllNotes();
    
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    // Clear any pending seek operations
    if (seekDebounceTimeout.current) {
      window.clearTimeout(seekDebounceTimeout.current);
      seekDebounceTimeout.current = null;
    }
  };

  // Handle progress bar changes
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const timeDiff = Math.abs(newTime - lastSeekTime.current);
    
    setCurrentTime(newTime);
    
    // Debounce the actual seeking operation
    if (seekDebounceTimeout.current) {
      window.clearTimeout(seekDebounceTimeout.current);
    }
    
    // If the time difference is significant
    if (timeDiff > 0.1 || !isDraggingProgress) {
      seekDebounceTimeout.current = window.setTimeout(() => {
        forceStopAllNotes();
        cleanupAndReposition(newTime);
        lastSeekTime.current = newTime;
      }, 50) as unknown as number;
    }
  };

  const handleProgressMouseDown = () => {
    setIsDraggingProgress(true);
    forceStopAllNotes();
    
    const transport = Tone.getTransport();
    transport.pause();
  };

  const handleProgressMouseUp = async (e: React.MouseEvent<HTMLInputElement>) => {
    setIsDraggingProgress(false);
    const newTime = parseFloat((e.target as HTMLInputElement).value);
    lastSeekTime.current = newTime;
    
    // Force stop any lingering notes before repositioning
    forceStopAllNotes();
    await cleanupAndReposition(newTime);
  };

  const cleanupAndReposition = async (newTime: number) => {
    const transport = Tone.getTransport();
    
    transport.cancel(0);
    scheduledEvents.current.forEach(id => {
      transport.clear(id);
    });
    scheduledEvents.current = [];
    forceStopAllNotes();
    
    transport.pause();
    transport.seconds = newTime;
    
    if (isPlaying) {
      try {
        await Tone.getContext().resume();
        
        // Reschedule all MIDI events from the current position
        if (midiData) {
          midiData.tracks.forEach((track) => {
            track.notes.forEach((note) => {
              if (note.time + note.duration > newTime) {
                // Only schedule notes that haven't finished playing yet
                if (note.time >= newTime) {
                  // Note starts after current position
                  const startId = transport.schedule((time) => {
                    if (synth.current && !isLoadingMidi.current) {
                      synth.current.triggerAttack(note.name, time, note.velocity);
                      activeNotes.current.add(note.name);
                    }
                  }, note.time);
                  
                  const releaseId = transport.schedule((time) => {
                    if (synth.current && !isLoadingMidi.current) {
                      synth.current.triggerRelease(note.name, time);
                      activeNotes.current.delete(note.name);
                    }
                  }, note.time + note.duration);
                  
                  scheduledEvents.current.push(startId, releaseId);
                } else {
                  // Note is currently playing at this position
                  const releaseId = transport.schedule((time) => {
                    if (synth.current && !isLoadingMidi.current) {
                      synth.current.triggerRelease(note.name, time);
                      activeNotes.current.delete(note.name);
                    }
                  }, note.time + note.duration);
                  
                  scheduledEvents.current.push(releaseId);
                }
              }
            });
          });
        }
        
        if (gainNode.current) {
          const gainValue = volume / 100;
          gainNode.current.gain.rampTo(gainValue, 0.1);
        }
        
        transport.start();
      } catch (error) {
        console.error("Error repositioning playback:", error);
        cleanupCurrentPlayback();
      }
    }
  };

  // Handle song changes
  useEffect(() => {
    const loadMidi = async () => {
      isLoadingMidi.current = true;
      
      try {
        // Clean up any existing playback before loading new MIDI
        cleanupCurrentPlayback();
        
        if (!selectedSong?.src) {
          isLoadingMidi.current = false;
          return;
        }

        const response = await fetch(selectedSong.src);
        const arrayBuffer = await response.arrayBuffer();
        const midi = new Midi(arrayBuffer);
        
        // Another cleanup in case the song changed during loading
        cleanupCurrentPlayback();
        
        setMidiData(midi);
        duration.current = midi.duration;

        const transport = Tone.getTransport();
        transport.cancel(0); // Clear any events from the previous song
        
        // Schedule new MIDI events
        midi.tracks.forEach((track) => {
          track.notes.forEach((note) => {
            const startId = transport.schedule((time) => {
              if (synth.current && !isLoadingMidi.current) {
                synth.current.triggerAttack(note.name, time, note.velocity);
                activeNotes.current.add(note.name);
              }
            }, note.time);

            const releaseId = transport.schedule((time) => {
              if (synth.current && !isLoadingMidi.current) {
                synth.current.triggerRelease(note.name, time);
                activeNotes.current.delete(note.name);
              }
            }, note.time + note.duration);

            scheduledEvents.current.push(startId, releaseId);
          });
        });

        const endId = transport.schedule(() => {
          cleanupCurrentPlayback();
        }, duration.current);
        
        scheduledEvents.current.push(endId);
        transport.position = 0;
        
      } catch (error) {
        console.error("Error loading MIDI file:", error);
        cleanupCurrentPlayback();
      } finally {
        isLoadingMidi.current = false;
      }
    };
    loadMidi();

    return () => {
      isLoadingMidi.current = true;
      cleanupCurrentPlayback();
    };
  }, [selectedSong]);

  const playPauseHandler = async () => {
    if (isLoadingMidi.current) return;
    try {
      await Tone.start();
      const transport = Tone.getTransport();
      
      if (isPlaying) {
        if (gainNode.current) {
          gainNode.current.gain.rampTo(0, 0.1);
        }
        
        transport.pause();
        if (synth.current) {
          synth.current.releaseAll();
          activeNotes.current.clear();
        }
        setIsPlaying(false);
      } else {
        const currentTime = transport.seconds;
        if (currentTime >= duration.current) {
          transport.position = 0;
          setCurrentTime(0);
        }

        await Tone.getContext().resume();
        
        if (gainNode.current) {
          const gainValue = volume / 100;
          gainNode.current.gain.rampTo(gainValue, 0.1);
        }

        transport.start();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error handling playback:", error);
      cleanupCurrentPlayback();
    }
  };

  const getVolumeSliderStyle = () => {
    return {
      background: isHoveringVolume
        ? `linear-gradient(to right, rgb(34 197 94) ${volume}%, rgb(75 85 99) ${volume}%)`
        : `linear-gradient(to right, rgb(255 255 255) ${volume}%, rgb(75 85 99) ${volume}%)`
    };
  };

  const getProgressSliderStyle = () => {
    const percent = (currentTime / duration.current) * 100;
    return {
      background: isHoveringProgress
      ? `linear-gradient(to right, rgb(34 197 94) ${percent}%, rgb(75 85 99) ${percent}%)`
      : `linear-gradient(to right, rgb(255 255 255) ${percent}%, rgb(75 85 99) ${percent}%)`
    };
  };

  return (
    <div className="flex flex-col bg-black text-white p-4 rounded-lg gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {selectedSong ? (
            <>
              <img
          src={selectedSong.cover || "/default-cover.jpg"}
          alt="Album Cover"
          className="w-12 h-12 rounded-lg"
              />
              <div>
          <p className="text-sm font-bold">{selectedSong.title}</p>
          {midiData && (
            <p className="text-xs text-gray-400">
              {midiData.tracks.length} tracks loaded
            </p>
          )}
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-lg bg-gray-800 animate-pulse" />
              <div>No song selected
          <div className="h-2 w-32" />
          <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4" />
            <div 
              className="relative flex items-center"
              onMouseEnter={() => setIsHoveringVolume(true)}
              onMouseLeave={() => setIsHoveringVolume(false)}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                style={getVolumeSliderStyle()}
                className="w-24 h-1 rounded-lg appearance-none cursor-pointer bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>
          </div>
          <button 
            onClick={playPauseHandler} 
            className="p-2 rounded-full hover:bg-white transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white hover:text-black" />
            ) : (
              <Play className="w-4 h-4 text-white hover:text-black" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2"
        onMouseEnter={() => setIsHoveringProgress(true)}
        onMouseLeave={() => setIsHoveringProgress(false)}
      >
        <span className="text-xs text-gray-400 w-12">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={duration.current}
          step="0.01"
          value={currentTime}
          onChange={handleProgressChange}
          onMouseDown={handleProgressMouseDown}
          onMouseUp={handleProgressMouseUp}
          style={getProgressSliderStyle()}
          className="flex-grow h-1 rounded-lg appearance-none cursor-pointer bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
        <span className="text-xs text-gray-400 w-12">
          {formatTime(duration.current)}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;