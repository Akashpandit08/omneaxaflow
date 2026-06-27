"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Save, Play, Film } from "lucide-react";
import api from "@/lib/api";
import type { Project, Video } from "@/types";
import { useProjectStore } from "@/store/projectStore";
import { Button, LinkButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { ScriptEditor } from "@/components/editor/ScriptEditor";
import { AvatarPicker } from "@/components/editor/AvatarPicker";
import { VoicePicker } from "@/components/editor/VoicePicker";
import { VideoStatusPanel } from "@/components/video/VideoStatus";
import { toast } from "@/components/ui/Toast";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Tab = "script" | "settings";

export default function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const qc      = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("script");
  const [latestVideoId, setLatestVideoId] = useState<number | undefined>(undefined);

  const { project, setProject, updateScript, setAvatar, setVoice, isDirty, markClean } =
    useProjectStore();

  const { data: serverProject, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  });

  useEffect(() => {
    if (serverProject) setProject(serverProject);
  }, [serverProject, setProject]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put<Project>(`/projects/${id}`, {
        title:       project?.title,
        description: project?.description,
        script:      project?.script,
        scenes:      project?.scenes,
        avatar_id:   project?.avatar_id,
        voice_id:    project?.voice_id,
      }).then((r) => r.data),
    onSuccess: () => {
      markClean();
      qc.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Project saved");
    },
    onError: () => toast.error("Failed to save project"),
  });

  const renderMutation = useMutation({
    mutationFn: () =>
      api.post<Video>("/videos/render", { project_id: Number(id) }).then((r) => r.data),
    onSuccess: (video) => {
      setLatestVideoId(video.id);
      toast.success("Render queued! Processing will start shortly.");
      qc.invalidateQueries({ queryKey: ["project", id] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to start render. Check your subscription limit.";
      toast.error(msg);
    },
  });

  const handleRender = async () => {
    if (isDirty) await saveMutation.mutateAsync();
    renderMutation.mutate();
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="skeleton h-8 w-8 rounded-lg" />
          <div className="skeleton h-7 w-48 rounded" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
          <div className="space-y-4">
            <div className="skeleton h-48 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!serverProject) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Film className="w-12 h-12 text-slate-700" />
        <p className="text-slate-400">Project not found.</p>
        <LinkButton href="/projects" variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to projects
        </LinkButton>
      </div>
    );
  }

  const showRenderStatus = ["rendering", "completed", "failed"].includes(serverProject.status);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <LinkButton href="/projects" variant="ghost" size="icon" aria-label="Back to projects">
            <ArrowLeft className="w-4 h-4" />
          </LinkButton>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{serverProject.title}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusBadge status={serverProject.status} />
              {isDirty && (
                <span className="text-xs text-yellow-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Save className="w-3.5 h-3.5" />}
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!isDirty && !saveMutation.isIdle}
          >
            Save
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Play className="w-3.5 h-3.5 fill-white" />}
            onClick={handleRender}
            loading={renderMutation.isPending}
            disabled={!project?.script?.trim()}
            title={!project?.script?.trim() ? "Add a script before rendering" : undefined}
          >
            Render Video
          </Button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-surface-border -mb-2">
        {(["script", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "text-brand-300 border-brand-500"
                : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600"
            }`}
            aria-selected={activeTab === tab}
            role="tab"
          >
            {tab === "script" ? "Script & Studio" : "Settings"}
          </button>
        ))}
      </div>

      {/* ── Script tab ── */}
      {activeTab === "script" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ScriptEditor 
              value={project?.script ?? ""} 
              onChange={updateScript} 
              onAutoSave={() => saveMutation.mutate()} 
            />
          </div>
          <div className="space-y-4">
            <AvatarPicker selectedId={project?.avatar_id ?? null} onSelect={setAvatar} />
            <VoicePicker  selectedId={project?.voice_id  ?? null} onSelect={setVoice}  />
          </div>
        </div>
      )}

      {/* ── Settings tab ── */}
      {activeTab === "settings" && (
        <div className="max-w-lg space-y-5">
          <Card className="space-y-4">
            <h3 className="font-semibold text-white">Project Settings</h3>
            <Input
              label="Title"
              defaultValue={serverProject.title}
              onChange={(e) =>
                useProjectStore.setState((s) => ({
                  project: { ...s.project, title: e.target.value },
                  isDirty: true,
                }))
              }
            />
            <Textarea
              label="Description"
              defaultValue={serverProject.description ?? ""}
              onChange={(e) =>
                useProjectStore.setState((s) => ({
                  project: { ...s.project, description: e.target.value },
                  isDirty: true,
                }))
              }
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            >
              Save settings
            </Button>
          </Card>
        </div>
      )}

      {/* ── Video render status ── */}
      {showRenderStatus && (
        <VideoStatusPanel
          projectId={Number(id)}
          projectStatus={serverProject.status}
          videoId={latestVideoId}
        />
      )}
    </div>
  );
}
