import React, { useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";

interface VoicePreviewPlayerProps {
  url: string | null;
  onClose: () => void;
}

export function VoicePreviewPlayer({ url, onClose }: VoicePreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (url && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, [url]);

  return (
    <Modal open={!!url} onClose={onClose} title="Voice Preview" size="sm">
      <div className="py-6 flex flex-col items-center">
        {url ? (
          <audio ref={audioRef} controls src={url} className="w-full">
            Your browser does not support the audio element.
          </audio>
        ) : (
          <p>Loading preview...</p>
        )}
      </div>
    </Modal>
  );
}
