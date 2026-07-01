import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface VoiceCloneUploaderProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

export function VoiceCloneUploader({ onUpload, isUploading }: VoiceCloneUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"];
    if (validTypes.includes(file.type) || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')) {
      onUpload(file);
    } else {
      alert("Invalid file type. Please upload a WAV, MP3, or M4A file.");
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".wav,.mp3,.m4a"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-secondary rounded-full">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium">Drag & drop your voice sample</p>
          <p className="text-sm text-muted-foreground">WAV, MP3, or M4A up to 50MB</p>
        </div>
        <Button 
          onClick={() => inputRef.current?.click()} 
          disabled={isUploading}
          variant="secondary"
        >
          {isUploading ? "Uploading..." : "Select Audio"}
        </Button>
      </div>
    </div>
  );
}
