"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Volume2, Play, Pause, Lock, Check, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import type { Voice, VoiceListResponse } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";

interface Props {
  selectedId: number | null;
  onSelect:   (voice: Voice) => void;
}

export function VoicePicker({ selectedId, onSelect }: Props) {
  const [expandModal,   setExpandModal]   = useState(false);
  const [playingId,     setPlayingId]     = useState<number | null>(null);
  const [currentAudio,  setCurrentAudio]  = useState<HTMLAudioElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["voices"],
    queryFn: () => api.get<VoiceListResponse>("/voices").then((r) => r.data),
  });

  const selectedVoice = data?.items.find((v) => v.id === selectedId);

  const previewMutation = useMutation({
    mutationFn: (voice_id: number) =>
      api.post<{ audio_url: string }>("/voices/preview", {
        voice_id,
        text: "Hello! This is a preview of my voice.",
      }).then((r) => r.data),
    onSuccess: (data, voice_id) => {
      currentAudio?.pause();
      const audio = new Audio(data.audio_url);
      setCurrentAudio(audio);
      setPlayingId(voice_id);
      audio.play().catch(() => toast.error("Could not play audio preview"));
      audio.onended = () => setPlayingId(null);
    },
    onError: () => toast.error("Preview failed"),
  });

  const handlePlayPause = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (voice.is_premium) return;
    if (playingId === voice.id) {
      currentAudio?.pause();
      setPlayingId(null);
    } else {
      previewMutation.mutate(voice.id);
    }
  };

  const handleSelect = (voice: Voice) => {
    if (!voice.is_premium) {
      onSelect(voice);
      setExpandModal(false);
    }
  };

  const isPreviewLoading = (id: number) =>
    previewMutation.isPending && previewMutation.variables === id;

  return (
    <>
      <div className="card space-y-3 !p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-brand-400" />
            <span className="font-semibold text-white text-sm">Voice</span>
          </div>
          <button
            onClick={() => setExpandModal(true)}
            className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            All voices <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Selected preview */}
        {selectedVoice && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-brand-600/10 border border-brand-600/20">
            <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center flex-shrink-0">
              <Volume2 className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedVoice.name}</p>
              <p className="text-xs text-slate-500 uppercase">{selectedVoice.language} · {selectedVoice.gender}</p>
            </div>
            <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
          </div>
        )}

        {/* Voice list (first 5) */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-11 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5 scrollbar-hide">
            {(data?.items ?? []).slice(0, 6).map((voice) => {
              const isSelected  = voice.id === selectedId;
              const isPlaying   = playingId === voice.id;
              const isLoading   = isPreviewLoading(voice.id);

              return (
                <div
                  key={voice.id}
                  onClick={() => handleSelect(voice)}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${voice.name}${voice.is_premium ? " — Pro required" : ""}`}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all",
                    isSelected
                      ? "border-brand-500 bg-brand-600/15"
                      : "border-surface-border hover:border-slate-500 hover:bg-surface-elevated",
                    voice.is_premium ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {voice.is_premium
                      ? <Lock className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      : <Volume2 className={cn("w-3 h-3 flex-shrink-0", isSelected ? "text-brand-400" : "text-slate-500")} />
                    }
                    <div className="min-w-0">
                      <p className={cn("font-medium truncate", isSelected ? "text-brand-300" : "text-slate-200")}>
                        {voice.name}
                      </p>
                      <p className="text-slate-600 uppercase text-[10px]">{voice.language} · {voice.gender}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handlePlayPause(voice, e)}
                    disabled={isLoading || voice.is_premium}
                    className="ml-2 p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-border text-slate-400 hover:text-white transition-colors flex-shrink-0 disabled:opacity-30"
                    aria-label={isPlaying ? "Stop preview" : "Play preview"}
                  >
                    {isLoading
                      ? <div className="w-3 h-3 border border-slate-400 border-t-brand-400 rounded-full animate-spin" />
                      : isPlaying
                        ? <Pause className="w-3 h-3" />
                        : <Play  className="w-3 h-3" />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expand modal */}
      <Modal
        open={expandModal}
        onClose={() => setExpandModal(false)}
        title="Choose Voice"
        description="Select a voice for your video narration."
        size="lg"
      >
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {(data?.items ?? []).map((voice) => {
            const isSelected = voice.id === selectedId;
            const isPlaying  = playingId === voice.id;
            const isLoading  = isPreviewLoading(voice.id);

            return (
              <div
                key={voice.id}
                onClick={() => handleSelect(voice)}
                role="button"
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                  isSelected
                    ? "border-brand-500 bg-brand-600/15"
                    : "border-surface-border hover:border-slate-500 hover:bg-surface-elevated",
                  voice.is_premium ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    isSelected ? "bg-brand-600/20" : "bg-surface-elevated"
                  )}>
                    <Volume2 className={cn("w-4 h-4", isSelected ? "text-brand-400" : "text-slate-500")} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{voice.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="slate" className="uppercase text-[10px]">{voice.language}</Badge>
                      {voice.gender && <span className="text-[10px] text-slate-600 capitalize">{voice.gender}</span>}
                      {voice.accent && <span className="text-[10px] text-slate-600">{voice.accent}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {voice.is_premium
                    ? <Badge variant="yellow" className="text-[10px]"><Lock className="w-2.5 h-2.5" />Pro</Badge>
                    : <Badge variant="green" className="text-[10px]">Free</Badge>
                  }
                  <button
                    onClick={(e) => handlePlayPause(voice, e)}
                    disabled={isLoading || voice.is_premium}
                    className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-border text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                    aria-label={isPlaying ? "Stop" : "Preview"}
                  >
                    {isLoading
                      ? <div className="w-3.5 h-3.5 border border-slate-400 border-t-brand-400 rounded-full animate-spin" />
                      : isPlaying
                        ? <Pause className="w-3.5 h-3.5" />
                        : <Play  className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
