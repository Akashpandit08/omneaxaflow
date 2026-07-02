import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Mic, Square, Play, UploadCloud, RefreshCw } from "lucide-react";

interface VoiceRecorderProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

const READING_SCRIPT = `Hello! I am reading this text to create a high-quality clone of my voice. I am speaking naturally, preserving my authentic tone, pacing, and pronunciation. I will ensure my breathing and pauses sound just like my everyday conversational style. By capturing this short paragraph, the AI can learn the subtle characteristics, warmth, and clarity of my speech without sounding robotic or exaggerated.`;

export function VoiceRecorder({ onUpload, isUploading }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access your microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleUpload = () => {
    if (audioBlob) {
      const file = new File([audioBlob], "recorded_voice.webm", { type: "audio/webm" });
      onUpload(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border border-border rounded-xl p-8 bg-surface shadow-sm">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Record Your Voice</h3>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Read the script below out loud to create a high-quality clone. Speak at a natural pace.
        </p>
      </div>

      <div className="bg-secondary/30 p-8 rounded-2xl text-center mb-8 border border-border">
        <p className="text-lg leading-relaxed font-medium text-foreground italic">
          "{READING_SCRIPT}"
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {isRecording ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 text-red-500 animate-pulse">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="font-mono text-xl font-medium">{formatTime(recordingTime)}</span>
            </div>
            <Button onClick={stopRecording} variant="danger" className="rounded-full w-20 h-20 p-0 shadow-lg shadow-red-500/20">
              <Square className="w-8 h-8" fill="currentColor" />
            </Button>
            <span className="text-sm font-medium">Stop Recording</span>
          </div>
        ) : !audioBlob ? (
          <div className="flex flex-col items-center space-y-4">
            <Button onClick={startRecording} variant="primary" className="rounded-full w-20 h-20 p-0 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20">
              <Mic className="w-8 h-8 text-white" />
            </Button>
            <span className="text-sm font-medium">Start Recording</span>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-6">
            <div className="w-full max-w-md bg-secondary/50 p-4 rounded-xl flex items-center justify-between border border-border">
              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-12" />
            </div>
            
            <div className="flex items-center space-x-4">
              <Button onClick={() => setAudioBlob(null)} variant="outline" className="px-6 py-6 rounded-xl">
                <RefreshCw className="w-5 h-5 mr-2" />
                Retake
              </Button>
              <Button onClick={handleUpload} disabled={isUploading} className="px-6 py-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white">
                <UploadCloud className="w-5 h-5 mr-2" />
                {isUploading ? "Processing..." : "Use This Recording"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
