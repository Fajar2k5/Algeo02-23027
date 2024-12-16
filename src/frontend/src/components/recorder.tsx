import { useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";

interface AudioContextWithClose extends AudioContext {
  close: () => Promise<void>;
}

const VoiceCaptureButton = () => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContextWithClose | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);

  const VOLUME_THRESHOLD = 0.6;
  const SILENCE_DURATION = 1500; // 1.5 detik

  const startAudioCapture = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass() as AudioContextWithClose;
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.smoothingTimeConstant = 0.4;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const average = sum / bufferLength;
        
        const normalizedVolume = Math.pow(average / 128, 0.5) * 2;
        const clampedVolume = Math.min(Math.max(normalizedVolume, 0), 3);
        
        setVolume(clampedVolume);

        if (clampedVolume < VOLUME_THRESHOLD) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current >= SILENCE_DURATION) {
            handleClose();
            return;
          }
        } else {
          silenceStartRef.current = null;
        }
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopAudioCapture = async (): Promise<void> => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    silenceStartRef.current = null;
    setVolume(0);
  };

  const showDialog = () => {
    setDialogOpen(true);
    void startAudioCapture();
  };

  useEffect(() => {
    return () => {
      void stopAudioCapture();
    };
  }, [dialogOpen]);

  const handleClose = () => {
    setDialogOpen(false);
    void stopAudioCapture();
  };

  return (
    <div>
      <button
        onClick={showDialog}
        className="bg-zinc-800 hover:opacity-80 text-white font-bold p-2 rounded-full hover:bg-zinc-600"
        type="button"
      >
        <Mic className="w-5 h-5" />
      </button>

      {dialogOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-white p-6 rounded-lg shadow-lg text-center relative"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="relative w-8 h-8 mx-auto my-8">
              <div 
                className="absolute inset-0 bg-zinc-500 rounded-full transition-transform duration-75 opacity-25"
                style={{
                  transform: `scale(${1 + volume})`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Mic className="w-10 h-10 text-zinc-900 animate-pulse" />
              </div>
            </div>
            <p className="text-lg font-bold mb-2">Voice Capture Active</p>
            <p className="text-sm mb-3">Start humming the song</p>
            <button 
              className="focus:outline-none bg-black active:bg-zinc-400 text-white active:text-black px-4 py-2 rounded-lg hover:bg-red-500"
              onClick={handleClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceCaptureButton;