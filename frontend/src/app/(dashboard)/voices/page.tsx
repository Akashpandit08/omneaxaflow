"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Volume2, Play, Lock, Pause, Globe } from "lucide-react";
import api from "@/lib/api";
import type { VoiceListResponse, Voice } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Loader";
import { Progress } from "@/components/ui/Progress";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const LANG_FILTERS = ["All", "en", "fr", "es", "de", "pt", "ja"];
const GENDER_FILTERS = ["All", "Male", "Female"];

export default function VoicesPage() {
  const [langFilter,   setLangFilter]   = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [playingId,    setPlayingId]    = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["voices", langFilter, genderFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (langFilter   !== "All") params.set("language", langFilter);
      if (genderFilter !== "All") params.set("gender",   genderFilter.toLowerCase());
      return api.get<VoiceListResponse>(`/voices?${params}`).then((r) => r.data);
    },
  });

  const previewMutation = useMutation({
    mutationFn: ({ voice_id, text }: { voice_id: number; text: string }) =>
      api.post<{ audio_url: string }>("/voices/preview", { voice_id, text }).then((r) => r.data),
    onSuccess: (data, vars) => {
      // Stop any playing audio
      currentAudio?.pause();
      const audio = new Audio(data.audio_url);
      setCurrentAudio(audio);
      setPlayingId(vars.voice_id);
      audio.play().catch(() => toast.error("Could not play audio"));
      audio.onended = () => setPlayingId(null);
    },
    onError: () => toast.error("Preview failed"),
  });

  const handlePlayPause = (voice: Voice) => {
    if (playingId === voice.id) {
      currentAudio?.pause();
      setPlayingId(null);
    } else {
      previewMutation.mutate({
        voice_id: voice.id,
        text: "Hello! This is a preview of my voice. I hope you like it.",
      });
    }
  };

  const FilterBar = ({ options, active, onChange }: {
    options: string[];
    active: string;
    onChange: (v: string) => void;
  }) => (
    <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors uppercase",
            active === o
              ? "bg-brand-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-surface-elevated"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Voices</h1>
          <p className="page-subtitle">Preview and select voices for your video scripts.</p>
        </div>
        <Badge variant="brand">
          <Globe className="w-3 h-3" />
          {data?.total ?? 0} voices
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <FilterBar options={LANG_FILTERS}   active={langFilter}   onChange={setLangFilter} />
        <FilterBar options={GENDER_FILTERS} active={genderFilter} onChange={setGenderFilter} />
      </div>

      {/* Table */}
      <Card noPadding>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<Volume2 className="w-7 h-7" />}
            title="No voices found"
            description="Try adjusting your filters."
            className="py-12"
          />
        ) : (
          <table className="table-root">
            <thead className="table-head">
              <tr>
                <th className="table-th">Voice</th>
                <th className="table-th">Language</th>
                <th className="table-th">Provider</th>
                <th className="table-th">Gender</th>
                <th className="table-th">Plan</th>
                <th className="table-th">Preview</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((voice) => {
                const isPlaying = playingId === voice.id;
                const isLoading = previewMutation.isPending && previewMutation.variables?.voice_id === voice.id;

                return (
                  <tr key={voice.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                          <Volume2 className="w-3.5 h-3.5 text-brand-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{voice.name}</p>
                          {voice.accent && (
                            <p className="text-xs text-slate-500">{voice.accent}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <Badge variant="slate" className="uppercase">{voice.language}</Badge>
                    </td>
                    <td className="table-td">
                      <span className="capitalize text-slate-300 text-sm">{voice.provider}</span>
                    </td>
                    <td className="table-td">
                      <span className="capitalize text-slate-300 text-sm">{voice.gender ?? "—"}</span>
                    </td>
                    <td className="table-td">
                      {voice.is_premium ? (
                        <Badge variant="yellow"><Lock className="w-2.5 h-2.5" />Pro</Badge>
                      ) : (
                        <Badge variant="green">Free</Badge>
                      )}
                    </td>
                    <td className="table-td">
                      <Button
                        variant="secondary"
                        size="xs"
                        disabled={voice.is_premium}
                        loading={isLoading}
                        onClick={() => handlePlayPause(voice)}
                        leftIcon={
                          isPlaying
                            ? <Pause className="w-3 h-3" />
                            : <Play className="w-3 h-3" />
                        }
                      >
                        {isPlaying ? "Stop" : "Play"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
