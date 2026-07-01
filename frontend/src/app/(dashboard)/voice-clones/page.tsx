"use client";

import React, { useEffect, useState } from "react";
import { VoiceCloneUploader } from "@/components/voice/VoiceCloneUploader";
import { VoiceCloneCard } from "@/components/voice/VoiceCloneCard";
import { VoicePreviewPlayer } from "@/components/voice/VoicePreviewPlayer";
import { useVoiceCloneStore } from "@/store/voiceCloneStore";

export default function VoiceClonesPage() {
  const { clones, setClones, addClone, removeClone } = useVoiceCloneStore();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/voices/clones", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => setClones(data))
      .catch(console.error);
  }, [setClones]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Create clone entry
      const res = await fetch("/api/v1/voices/clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          name: file.name.split('.')[0],
          provider: "elevenlabs" // default
        })
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      addClone(data);
      
      // We would normally upload the audio file to S3 here
      
    } catch (err) {
      console.error(err);
      alert("Failed to upload and clone voice");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/voices/clones/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        removeClone(id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreview = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/voices/clones/${id}/preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewUrl(data.preview_url);
      } else {
        alert("Preview not ready or failed to generate.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Voice Clones</h1>
        <p className="text-muted-foreground mt-2">
          Create custom AI voices by uploading a short audio sample of yourself or your talent.
        </p>
      </div>

      <VoiceCloneUploader onUpload={handleUpload} isUploading={isUploading} />

      {clones.length > 0 && (
        <div className="pt-8 border-t">
          <h2 className="text-xl font-semibold mb-4">Your Custom Voices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clones.map(clone => (
              <VoiceCloneCard 
                key={clone.id} 
                clone={clone} 
                onDelete={handleDelete}
                onPreview={handlePreview}
              />
            ))}
          </div>
        </div>
      )}

      <VoicePreviewPlayer url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}
