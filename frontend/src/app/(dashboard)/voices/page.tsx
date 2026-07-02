"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Volume2, Play, Lock, Pause, Globe, Plus, Mic } from "lucide-react";
import api from "@/lib/api";
import type { VoiceListResponse, Voice, VoiceClone } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { VoiceCloneModal } from "@/components/voices/VoiceCloneModal";
import { VoiceCloneCard } from "@/components/voices/VoiceCloneCard";

const LANG_FILTERS = ["All", "en", "fr", "es", "de", "pt", "ja"];
const GENDER_FILTERS = ["All", "Male", "Female"];

export default function VoicesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"system" | "clones">("system");
  const [langFilter, setLangFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  
  // Audio preview state
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // System voices query
  const { data: systemVoices, isLoading: isLoadingSystem } = useQuery({
    queryKey: ["voices", langFilter, genderFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (langFilter !== "All") params.set("language", langFilter);
      if (genderFilter !== "All") params.set("gender", genderFilter.toLowerCase());
      return api.get<VoiceListResponse>(`/voices?${params}`).then((r) => r.data);
    },
    enabled: activeTab === "system",
  });

  // Cloned voices query
  const { data: cloneVoices, isLoading: isLoadingClones } = useQuery({
    queryKey: ["voice-clones"],
    queryFn: () => api.get<VoiceClone[]>("/voices/clones").then((r) => r.data),
    enabled: activeTab === "clones",
    refetchInterval: (query) => {
      // Poll every 5s if any clone is still training
      const hasTraining = query.state.data?.some(c => c.status === "training");
      return hasTraining ? 5000 : false;
    }
  });

  const previewMutation = useMutation({
    mutationFn: ({ voice_id, text }: { voice_id: number; text: string }) =>
      api.post<{ audio_url: string }>("/voices/preview", { voice_id, text }).then((r) => r.data),
    onSuccess: (data, vars) => {
      currentAudio?.pause();
      const audio = new Audio(data.audio_url);
      setCurrentAudio(audio);
      setPlayingId(vars.voice_id);
      audio.play().catch(() => toast.error("Could not play audio"));
      audio.onended = () => setPlayingId(null);
    },
    onError: () => toast.error("Preview failed"),
  });

  const deleteCloneMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/voices/clones/${id}`),
    onSuccess: () => {
      toast.success("Voice clone deleted");
      queryClient.invalidateQueries({ queryKey: ["voice-clones"] });
    },
    onError: () => toast.error("Failed to delete voice clone"),
  });

  const retrainCloneMutation = useMutation({
    mutationFn: (id: number) => api.post(`/voices/clones/${id}/retrain`),
    onSuccess: () => {
      toast.success("Voice clone retraining started");
      queryClient.invalidateQueries({ queryKey: ["voice-clones"] });
    },
    onError: () => toast.error("Failed to retrain voice clone"),
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

  const FilterBar = ({ options, active, onChange }: { options: string[]; active: string; onChange: (v: string) => void; }) => (
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="page-header mb-0 border-none pb-0">
          <div>
            <h1 className="page-title">Voices</h1>
            <p className="page-subtitle">Preview system voices or create your own clones.</p>
          </div>
        </div>
        
        <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Mic className="w-4 h-4" />}>
          Clone Voice
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-surface-border">
        <button
          onClick={() => setActiveTab("system")}
          className={cn(
            "pb-3 text-sm font-medium transition-colors relative",
            activeTab === "system" ? "text-brand-400" : "text-slate-400 hover:text-slate-200"
          )}
        >
          System Voices
          {activeTab === "system" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab("clones")}
          className={cn(
            "pb-3 text-sm font-medium transition-colors relative flex items-center gap-2",
            activeTab === "clones" ? "text-brand-400" : "text-slate-400 hover:text-slate-200"
          )}
        >
          My Clones
          <Badge variant="brand" className="py-0 px-1.5 text-[10px]">{cloneVoices?.length || 0}</Badge>
          {activeTab === "clones" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-t-full" />}
        </button>
      </div>

      {/* System Voices Tab */}
      {activeTab === "system" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-wrap gap-3">
            <FilterBar options={LANG_FILTERS} active={langFilter} onChange={setLangFilter} />
            <FilterBar options={GENDER_FILTERS} active={genderFilter} onChange={setGenderFilter} />
          </div>

          <Card noPadding>
            {isLoadingSystem ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-14 rounded-xl" />
                ))}
              </div>
            ) : !systemVoices?.items.length ? (
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
                    <th className="table-th text-right">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {systemVoices.items.map((voice) => {
                    const isPlaying = playingId === voice.id;
                    const isLoadingPreview = previewMutation.isPending && previewMutation.variables?.voice_id === voice.id;

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
                            <Badge variant="yellow"><Lock className="w-2.5 h-2.5 mr-1" />Pro</Badge>
                          ) : (
                            <Badge variant="green">Free</Badge>
                          )}
                        </td>
                        <td className="table-td text-right">
                          <Button
                            variant="secondary"
                            size="xs"
                            disabled={voice.is_premium}
                            loading={isLoadingPreview}
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
      )}

      {/* My Clones Tab */}
      {activeTab === "clones" && (
        <div className="animate-fade-in">
          {isLoadingClones ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-32 rounded-2xl" />
              ))}
            </div>
          ) : !cloneVoices?.length ? (
            <EmptyState
              icon={<Mic className="w-7 h-7" />}
              title="No voice clones yet"
              description="Clone your voice or someone else's with permission to use in your videos."
              action={
                <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                  Clone a Voice
                </Button>
              }
              className="py-16"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cloneVoices.map((clone) => (
                <VoiceCloneCard
                  key={clone.id}
                  clone={clone}
                  onDelete={(id) => deleteCloneMutation.mutate(id)}
                  onRetrain={(id) => retrainCloneMutation.mutate(id)}
                  isDeleting={deleteCloneMutation.isPending && deleteCloneMutation.variables === clone.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clone Voice Modal */}
      <VoiceCloneModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["voice-clones"] });
          setActiveTab("clones");
        }} 
      />
    </div>
  );
}
