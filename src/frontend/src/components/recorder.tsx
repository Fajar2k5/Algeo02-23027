"use client";
import { useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";
import axios from "axios";

function VoiceCaptureButton(): JSX.Element {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0); // Added state for volume
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const RECORDING_MAX_DURATION = 240; // 4 minutes in seconds
  const SILENCE_THRESHOLD = 0.6;
  const SILENCE_DURATION = 1500; // 1.5 seconds

  useEffect(() => {
    const initAudioStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);

        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.4;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    };

    initAudioStream();

    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const sendAudioToEndpoint = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");

    try {
      const response = await axios.post("http://127.0.0.1:8000/humming-query/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Audio uploaded successfully:", response.data);
    } catch (error) {
      console.error("Error sending audio to backend:", error);
    }
  };

  useEffect(() => {
    if (mediaRecorder) {
      const audioChunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioFile = new Blob(audioChunks, { type: "audio/wav" });
        sendAudioToEndpoint(audioFile);
      };
    }
  }, [mediaRecorder]);

  const detectSilence = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    const normalizedVolume = Math.pow(average / 128, 0.5) * 2;

    setVolume(normalizedVolume); // Update volume state

    if (normalizedVolume < SILENCE_THRESHOLD) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          handleClose();
        }, SILENCE_DURATION);
      }
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectSilence);
  };

  const startRecording = (): void => {
    if (mediaRecorder && audioStream) {
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => {
          if (prevTime >= RECORDING_MAX_DURATION - 1) {
            stopRecording();
            return RECORDING_MAX_DURATION;
          }
          return prevTime + 1;
        });
      }, 1000);

      detectSilence();
    }
  };

  const stopRecording = (): void => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  const handleOpen = (): void => {
    setDialogOpen(true);
    startRecording();
  };

  const handleClose = (): void => {
    setDialogOpen(false);
    stopRecording();
  };

  return (
    <div>
      <button
        onClick={handleOpen}
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
                  transform: `scale(${1 + volume})`, // Use the volume state
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
}

export default VoiceCaptureButton;
