import React from "react";
import { VoiceClone } from "@/store/voiceCloneStore";
import { Button } from "@/components/ui/Button";

interface VoiceCloneCardProps {
  clone: VoiceClone;
  onDelete: (id: number) => void;
  onPreview: (id: number) => void;
  onRetrain?: (id: number) => void;
}

export function VoiceCloneCard({ clone, onDelete, onPreview, onRetrain }: VoiceCloneCardProps) {
  const getStatusColor = () => {
    switch (clone.status) {
      case "ready": return "text-green-500 bg-green-50";
      case "failed": return "text-red-500 bg-red-50";
      case "training": return "text-blue-500 bg-blue-50";
      default: return "text-gray-500 bg-gray-50";
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{clone.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">Provider: {clone.provider}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${getStatusColor()}`}>
          {clone.status}
        </span>
      </div>

      {clone.status === "training" && (
        <div className="space-y-2">
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse w-full"></div>
          </div>
          <p className="text-xs text-muted-foreground text-right">Training model...</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        {clone.status === "failed" && onRetrain ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onRetrain(clone.id)}
          >
            Retrain Voice
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            disabled={clone.status !== "ready"}
            onClick={() => onPreview(clone.id)}
          >
            Preview Voice
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(clone.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
