import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface FileUploadProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

export function FileUpload({ onUpload, isUploading }: FileUploadProps) {
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
    const validTypes = ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-powerpoint", "application/pdf"];
    if (validTypes.includes(file.type) || file.name.endsWith('.ppt') || file.name.endsWith('.pptx') || file.name.endsWith('.pdf')) {
      onUpload(file);
    } else {
      alert("Invalid file type. Please upload a PDF or PowerPoint file.");
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
        accept=".pdf,.ppt,.pptx"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-secondary rounded-full">
          {/* Document icon placeholder */}
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium">Drag & drop your presentation or PDF</p>
          <p className="text-sm text-muted-foreground">or click to browse files</p>
        </div>
        <Button 
          onClick={() => inputRef.current?.click()} 
          disabled={isUploading}
          variant="secondary"
        >
          {isUploading ? "Uploading..." : "Select File"}
        </Button>
      </div>
    </div>
  );
}
