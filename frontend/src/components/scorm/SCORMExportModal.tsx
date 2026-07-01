import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface SCORMExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (version: string) => Promise<void>;
}

export function SCORMExportModal({ open, onClose, onExport }: SCORMExportModalProps) {
  const [version, setVersion] = useState("SCORM 1.2");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExport = async () => {
    setIsSubmitting(true);
    try {
      await onExport(version);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !isSubmitting && onClose()} title="Export to SCORM">
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Generate an LMS-compatible ZIP package for your video and interactive quizzes.
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium">SCORM Version</label>
          <select 
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="SCORM 1.2">SCORM 1.2</option>
            <option value="SCORM 2004">SCORM 2004</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={handleExport} disabled={isSubmitting}>
          {isSubmitting ? "Exporting..." : "Start Export"}
        </Button>
      </div>
    </Modal>
  );
}
