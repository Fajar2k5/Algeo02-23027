import { useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";

interface AudioContextWithClose extends AudioContext {
  close: () => Promise<void>;
}

const VoiceCaptureButton = () => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(15);
  const [volume, setVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContextWithClose | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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

    setVolume(0);
  };

  const showDialog = () => {
    setDialogOpen(true);
    setCountdown(15);
    void startAudioCapture();
  };

  useEffect(() => {
    if (dialogOpen) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setDialogOpen(false);
            void stopAudioCapture();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        void stopAudioCapture();
      };
    }
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
            <p className="text-sm mb-3">Time Remaining: {formatTime(countdown)}</p>
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