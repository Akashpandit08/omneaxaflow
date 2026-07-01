import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LanguageSelector } from "./LanguageSelector";

interface TranslationModalProps {
  videoId: number;
  onTranslate: (targetLanguage: string) => Promise<void>;
}

export function TranslationModal({ videoId, onTranslate }: TranslationModalProps) {
  const [open, setOpen] = useState(false);
  const [targetLang, setTargetLang] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!targetLang) return;
    setIsSubmitting(true);
    try {
      await onTranslate(targetLang);
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Translate Video</Button>
      <Modal 
        open={open} 
        onClose={() => !isSubmitting && setOpen(false)}
        title="Translate Video"
        description="Select a target language to translate the video script and voice. Glossary terms will be applied automatically."
        footer={
          <div className="flex justify-end space-x-2 w-full">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!targetLang || isSubmitting}>
              {isSubmitting ? "Translating..." : "Start Translation"}
            </Button>
          </div>
        }
      >
        <div className="py-4">
          <LanguageSelector 
            value={targetLang} 
            onChange={setTargetLang} 
            disabled={isSubmitting} 
          />
        </div>
      </Modal>
    </>
  );
}
