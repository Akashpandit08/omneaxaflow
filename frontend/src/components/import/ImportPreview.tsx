import React from "react";
import { ImportJob } from "@/store/importStore";
import { Button } from "@/components/ui/Button";

export function ImportPreview({ job, onContinue }: { job: ImportJob, onContinue: () => void }) {
  if (job.status !== "completed" || !job.parsed_content) {
    return null;
  }

  const scenes = job.parsed_content.scenes || [];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg border-b pb-2">Extracted Scenes</h3>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {scenes.map((scene: any, idx: number) => (
          <div key={idx} className="p-3 border rounded bg-muted/30">
            <h4 className="font-medium text-sm text-primary mb-1">{scene.title || `Scene ${idx + 1}`}</h4>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{scene.text || scene.script}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <Button onClick={onContinue}>Open Project</Button>
      </div>
    </div>
  );
}
