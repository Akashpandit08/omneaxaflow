"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, UploadCloud, X, Play, Pause, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface VoiceCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoiceCloneModal({ isOpen, onClose, onSuccess }: VoiceCloneModalProps) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"upload" | "record">("upload");
  const [file, setFile] = useState<File | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Cleanup on unmount or mode switch
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (previewAudio) {
        previewAudio.pause();
        URL.revokeObjectURL(previewAudio.src);
      }
    };
  }, [previewAudio]);

  const handleReset = () => {
    setFile(null);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    if (previewAudio) {
      previewAudio.pause();
      URL.revokeObjectURL(previewAudio.src);
      setPreviewAudio(null);
    }
    setIsPlaying(false);
  };

  const handleClose = () => {
    handleReset();
    setName("");
    onClose();
  };

  const checkAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(URL.createObjectURL(file));
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => reject(new Error("Failed to load audio"));
    });
  };

  const handleFileSelect = async (selectedFile: File) => {
    const validTypes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a", "audio/mp3"];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(mp3|wav|m4a)$/i)) {
      toast.error("Unsupported format. Please use .mp3, .wav, or .m4a");
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      toast.error("File size must be under 25MB");
      return;
    }

    try {
      const duration = await checkAudioDuration(selectedFile);
      if (duration < 30) {
        toast.error("Audio must be at least 30 seconds long");
        return;
      }
    } catch (e) {
      // In case we can't check duration locally, let backend handle it
    }

    setFile(selectedFile);
    const audio = new Audio(URL.createObjectURL(selectedFile));
    audio.onended = () => setIsPlaying(false);
    setPreviewAudio(audio);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const recordedFile = new File([blob], "recording.webm", { type: "audio/webm" });
        setFile(recordedFile);
        const audio = new Audio(URL.createObjectURL(blob));
        audio.onended = () => setIsPlaying(false);
        setPreviewAudio(audio);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlay = () => {
    if (isPlaying && previewAudio) {
      previewAudio.pause();
      setIsPlaying(false);
    } else if (previewAudio) {
      previewAudio.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a voice name");
      return;
    }
    if (!file) {
      toast.error("Please provide an audio sample");
      return;
    }

    // Final duration check for recordings
    if (mode === "record" && recordingTime < 30) {
      toast.error("Recording must be at least 30 seconds");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("provider", "cartesia");
    formData.append("audio_file", file);

    try {
      await api.post("/voices/clone", formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
          setUploadProgress(percentCompleted);
        },
      });
      toast.success("Voice cloning started!");
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to clone voice");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white">Clone Voice</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          <Input
            label="Voice Name *"
            placeholder="e.g. My Voice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isUploading}
          />

          <div className="space-y-3">
            <div className="flex p-1 bg-surface-card rounded-lg border border-surface-border">
              <button
                className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", mode === "upload" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white")}
                onClick={() => { setMode("upload"); handleReset(); }}
                disabled={isUploading}
              >
                Upload Audio
              </button>
              <button
                className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", mode === "record" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white")}
                onClick={() => { setMode("record"); handleReset(); }}
                disabled={isUploading}
              >
                Record Voice
              </button>
            </div>

            {/* Audio State Box */}
            <div className="bg-surface-card border border-dashed border-surface-border rounded-xl p-6 flex flex-col items-center justify-center min-h-[160px] text-center">
              {file ? (
                <div className="w-full">
                  <div className="flex items-center justify-between bg-surface p-3 rounded-lg border border-surface-border">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Button variant="secondary" size="sm" onClick={togglePlay} className="flex-shrink-0 !rounded-full w-8 h-8 !p-0">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </Button>
                      <span className="text-sm text-slate-300 truncate">{file.name}</span>
                    </div>
                    <button onClick={handleReset} disabled={isUploading} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : mode === "upload" ? (
                <label 
                  className="cursor-pointer group flex flex-col items-center w-full"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                  }}
                >
                  <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-600/20 transition-colors">
                    <UploadCloud className="w-6 h-6 text-brand-400" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Click or drag & drop</p>
                  <p className="text-xs text-slate-500">.mp3, .wav, .m4a (Max 25MB)</p>
                  <p className="text-xs text-brand-400 mt-2 font-medium">Recommended: 1 to 5 minutes of clear speech</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                    }}
                  />
                </label>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300",
                    isRecording ? "bg-red-500/20 animate-pulse" : "bg-surface"
                  )}>
                    <Mic className={cn("w-7 h-7", isRecording ? "text-red-400" : "text-brand-400")} />
                  </div>
                  <p className="text-2xl font-mono text-white mb-4">{formatTime(recordingTime)}</p>
                  
                  {isRecording ? (
                    <Button variant="danger" onClick={stopRecording}>Stop Recording</Button>
                  ) : (
                    <Button variant="secondary" onClick={startRecording}>Start Recording</Button>
                  )}
                  <p className="text-xs text-slate-500 mt-4">Read a book or script for at least 30 seconds.</p>
                </div>
              )}
            </div>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading and training...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-border bg-surface-card flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isUploading || !file || !name.trim()}>
            {isUploading ? "Processing..." : "Clone Voice"}
          </Button>
        </div>
      </div>
    </div>
  );
}
