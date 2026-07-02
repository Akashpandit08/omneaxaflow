"use client";

import { useState } from "react";
import { VoiceClone } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Play, Pause, Trash2, Clock, CheckCircle2, AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface VoiceCloneCardProps {
  clone: VoiceClone;
  onDelete: (id: number) => void;
  onRetrain?: (id: number) => void;
  isDeleting?: boolean;
}

export function VoiceCloneCard({ clone, onDelete, onRetrain, isDeleting }: VoiceCloneCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (!clone.preview_url) {
        toast.error("Preview not available yet.");
        return;
      }
      
      const newAudio = new Audio(clone.preview_url);
      newAudio.onended = () => setIsPlaying(false);
      newAudio.play().catch(() => {
        toast.error("Failed to play preview");
        setIsPlaying(false);
      });
      setAudio(newAudio);
      setIsPlaying(true);
    }
  };

  const getStatusBadge = () => {
    switch (clone.status) {
      case "ready":
        return <Badge variant="green"><CheckCircle2 className="w-3 h-3 mr-1" />Ready</Badge>;
      case "training":
        return <Badge variant="yellow"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Training</Badge>;
      case "failed":
        return <Badge variant="red"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="slate"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card className="flex flex-col h-full animate-fade-in group hover:border-brand-600/40 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-semibold text-white mb-1 group-hover:text-brand-300 transition-colors">
            {clone.name}
          </h3>
          <p className="text-xs text-slate-400">
            {new Date(clone.created_at).toLocaleDateString()}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex-grow">
        {clone.status === "training" && (
          <p className="text-sm text-slate-400">Your voice is currently being trained. This usually takes a few minutes.</p>
        )}
        {clone.status === "failed" && (
          <p className="text-sm text-red-400">Failed to train voice clone. Please try again with a clearer audio sample.</p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-border">
        {clone.status === "failed" && onRetrain ? (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            disabled={isDeleting}
            onClick={() => onRetrain(clone.id)}
            leftIcon={<RotateCw className="w-4 h-4" />}
          >
            Retrain
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            disabled={clone.status !== "ready" || !clone.preview_url}
            onClick={togglePlay}
            leftIcon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          >
            {isPlaying ? "Stop" : "Preview"}
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50"
          disabled={isDeleting}
          onClick={() => {
            if (window.confirm("Are you sure you want to delete this voice clone?")) {
              onDelete(clone.id);
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
