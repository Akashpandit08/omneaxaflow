"use client";

import React, { useEffect, useState } from "react";
import { VoiceCloneUploader } from "@/components/voice/VoiceCloneUploader";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";
import { VoiceCloneCard } from "@/components/voice/VoiceCloneCard";
import { VoicePreviewPlayer } from "@/components/voice/VoicePreviewPlayer";
import { useVoiceCloneStore } from "@/store/voiceCloneStore";
import { Button } from "@/components/ui/Button";
import {
  createVoiceClone,
  deleteVoiceClone,
  generateVoiceClonePreview,
  listVoiceClones,
  retrainVoiceClone,
} from "@/lib/api";

export default function VoiceClonesPage() {
  const { clones, setClones, addClone, removeClone } = useVoiceCloneStore();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"record" | "upload">("record");
  const [provider, setProvider] = useState<string>("cartesia");

  useEffect(() => {
    listVoiceClones()
      .then(setClones)
      .catch(console.error);
  }, [setClones]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const data = await createVoiceClone(file, file.name.split(".")[0] || "My Voice Clone", provider);
      addClone(data);
      
    } catch (err) {
      console.error(err);
      alert("Failed to upload and clone voice");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteVoiceClone(id);
      removeClone(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetrain = async (id: number) => {
    try {
      const data = await retrainVoiceClone(id);
      setClones(clones.map(c => c.id === id ? data : c));
    } catch (err) {
      console.error(err);
      alert("Failed to retrain voice clone");
    }
  };

  const handlePreview = async (id: number) => {
    try {
      const data = await generateVoiceClonePreview(id);
      setPreviewUrl(data.preview_url);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Preview not ready or failed to generate.");
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Voice Clones</h1>
        <p className="text-muted-foreground mt-2">
          Create custom AI voices by recording a short audio sample of yourself or uploading a file.
        </p>
      </div>

      <div className="p-4 border rounded-lg bg-card">
        <label className="block text-sm font-medium mb-2">Select Provider</label>
        <select 
          value={provider} 
          onChange={(e) => setProvider(e.target.value)}
          className="w-full md:w-1/3 p-2 border rounded-md mb-4 bg-background text-foreground"
        >
          <option value="cartesia">Cartesia (Hosted/free trial)</option>
          <option value="xtts">XTTS (Local/heavy)</option>
          <option value="elevenlabs">ElevenLabs (disabled unless explicitly enabled)</option>
          <option value="polly">Amazon Polly (TTS only)</option>
        </select>

        {provider === "cartesia" && <p className="text-sm text-muted-foreground">Hosted voice cloning without running XTTS on your computer.</p>}

        {provider === "xtts" && <p className="text-sm text-muted-foreground">Local voice cloning without ElevenLabs API calls.</p>}

        {provider === "elevenlabs" && <p className="text-sm text-muted-foreground">Requires ENABLE_ELEVENLABS_TTS=true and an API key.</p>}

        {provider === "polly" && <p className="text-sm text-muted-foreground">TTS available. Voice cloning unavailable.</p>}
      </div>

      <div className="flex space-x-2 border-b border-border mb-6 pb-2">
        <Button 
          variant={activeTab === "record" ? "primary" : "ghost"} 
          onClick={() => setActiveTab("record")}
        >
          Record Voice
        </Button>
        <Button 
          variant={activeTab === "upload" ? "primary" : "ghost"} 
          onClick={() => setActiveTab("upload")}
        >
          Upload Audio File
        </Button>
      </div>

      {activeTab === "record" ? (
        <VoiceRecorder onUpload={handleUpload} isUploading={isUploading} />
      ) : (
        <VoiceCloneUploader onUpload={handleUpload} isUploading={isUploading} />
      )}

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
                onRetrain={handleRetrain}
              />
            ))}
          </div>
        </div>
      )}

      <VoicePreviewPlayer url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}
