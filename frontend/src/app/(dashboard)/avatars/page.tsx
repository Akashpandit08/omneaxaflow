"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User, Lock, Sparkles, Check, Search, X,
  Play, Pause, Eye, ChevronRight, Star, Filter, Plus, Upload, Loader2,
} from "lucide-react";
import api, { resolveMediaUrl } from "@/lib/api";
import type { AvatarListResponse, Avatar } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["All", "Business", "Education", "Lifestyle", "Entertainment"];
const GENDER_FILTERS = ["All", "Male", "Female", "Neutral"];
const STYLE_FILTERS = ["All", "Professional", "Casual", "Animated"];

const GRADIENTS: Record<string, string> = {
  A: "from-violet-600 to-indigo-600",
  B: "from-emerald-500 to-teal-600",
  C: "from-pink-500 to-rose-600",
  D: "from-orange-500 to-amber-500",
  E: "from-cyan-500 to-blue-600",
  F: "from-fuchsia-600 to-purple-600",
  G: "from-lime-500 to-green-600",
  J: "from-emerald-600 to-green-500",
  K: "from-sky-500 to-blue-600",
  L: "from-fuchsia-500 to-pink-600",
  M: "from-red-500 to-orange-500",
  N: "from-teal-500 to-cyan-600",
  R: "from-rose-500 to-red-600",
  S: "from-sky-500 to-cyan-500",
  T: "from-amber-500 to-orange-600",
  default: "from-brand-600 to-violet-600",
};
const getGradient = (name: string) =>
  GRADIENTS[name[0]?.toUpperCase()] ?? GRADIENTS.default;

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterPill({
  options,
  active,
  onChange,
}: {
  options: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-xl p-1 flex-wrap">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            active === o
              ? "bg-brand-600 text-white shadow-glow-sm"
              : "text-slate-400 hover:text-white hover:bg-surface-elevated"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function AvatarVideoPreview({ url, name }: { url: string; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const v = videoRef.current;
      if (!v) return;
      if (playing) {
        v.pause();
        setPlaying(false);
      } else {
        v.play();
        setPlaying(true);
      }
    },
    [playing]
  );

  return (
    <div className="relative w-full h-full group/video">
      <video
        ref={videoRef}
        src={url}
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
        aria-label={`${name} preview`}
      />
      <button
        onClick={toggle}
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/video:opacity-100 transition-opacity"
        aria-label={playing ? "Pause preview" : "Play preview"}
      >
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
          {playing ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </div>
      </button>
    </div>
  );
}

function AvatarVisual({
  avatar,
  size = "md",
}: {
  avatar: Avatar;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-14 h-14 text-xl",
    md: "w-20 h-20 text-3xl",
    lg: "w-28 h-28 text-5xl",
  };
  const thumbnailUrl = resolveMediaUrl(avatar.thumbnail_url);

  if (thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbnailUrl}
        alt={avatar.name}
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shadow-glow-sm",
        getGradient(avatar.name),
        sizeClasses[size]
      )}
    >
      {avatar.name[0]}
    </div>
  );
}

// ─── Avatar Card ─────────────────────────────────────────────────────────────

function AvatarCard({
  avatar,
  isSelected,
  onSelect,
  onPreview,
}: {
  avatar: Avatar;
  isSelected: boolean;
  onSelect: (a: Avatar) => void;
  onPreview: (a: Avatar) => void;
}) {
  const [videoHover, setVideoHover] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    if (avatar.preview_video_url) {
      setVideoHover(true);
      videoRef.current?.play().catch(() => {});
    }
  };
  const handleMouseLeave = () => {
    if (avatar.preview_video_url) {
      setVideoHover(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  };
  const previewVideoUrl = resolveMediaUrl(avatar.preview_video_url);

  return (
    <div
      className={cn(
        "group relative flex flex-col bg-surface-card border rounded-2xl overflow-hidden",
        "transition-all duration-200 hover:-translate-y-1",
        isSelected
          ? "border-brand-500 shadow-glow-sm ring-1 ring-brand-500/50"
          : "border-surface-border hover:border-brand-600/40 hover:shadow-card-hover"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Badges */}
      <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1.5">
        {avatar.is_premium && (
          <Badge variant="yellow">
            <Lock className="w-2.5 h-2.5" />
            Pro
          </Badge>
        )}
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center shadow-glow-sm">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Visual area */}
      <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-surface-elevated to-surface-border overflow-hidden flex items-center justify-center">
        {previewVideoUrl ? (
          <>
            {/* Video (plays on hover) */}
            <video
              ref={videoRef}
              src={previewVideoUrl}
              loop
              muted
              playsInline
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                videoHover ? "opacity-100" : "opacity-0"
              )}
            />
            {/* Thumbnail (shown when not hovering) */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
                videoHover ? "opacity-0" : "opacity-100"
              )}
            >
              <AvatarVisual avatar={avatar} size="md" />
            </div>
            {/* Play hint */}
            {!videoHover && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-white/80">
                <Play className="w-2.5 h-2.5" /> Preview
              </div>
            )}
          </>
        ) : (
          <AvatarVisual avatar={avatar} size="md" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="font-semibold text-white text-sm truncate">{avatar.name}</h3>
          {avatar.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{avatar.description}</p>
          )}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {avatar.gender && (
              <Badge variant="slate" className="text-[10px] capitalize">
                {avatar.gender}
              </Badge>
            )}
            {avatar.style && (
              <Badge variant="brand" className="text-[10px] capitalize">
                {avatar.style}
              </Badge>
            )}
            {avatar.category && (
              <Badge variant="cyan" className="text-[10px] capitalize">
                {avatar.category}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onPreview(avatar)}
            className="flex-none flex items-center justify-center w-8 h-8 rounded-lg border border-surface-border hover:border-slate-500 hover:bg-surface-elevated text-slate-400 hover:text-white transition-all"
            title="Preview"
            aria-label={`Preview ${avatar.name}`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelect(avatar)}
            disabled={avatar.is_premium}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium py-2 transition-all",
              isSelected
                ? "bg-brand-600/20 border border-brand-500/50 text-brand-300"
                : avatar.is_premium
                ? "bg-surface-elevated border border-surface-border text-slate-500 cursor-not-allowed"
                : "bg-surface-elevated border border-surface-border text-slate-300 hover:bg-brand-600/15 hover:border-brand-500/50 hover:text-brand-300"
            )}
            aria-label={
              avatar.is_premium
                ? "Upgrade to Pro to use this avatar"
                : isSelected
                ? "Deselect avatar"
                : `Select ${avatar.name}`
            }
          >
            {isSelected ? (
              <>
                <Check className="w-3 h-3" /> Selected
              </>
            ) : avatar.is_premium ? (
              <>
                <Lock className="w-3 h-3" /> Pro only
              </>
            ) : (
              "Select"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function AvatarPreviewModal({
  avatar,
  isSelected,
  onClose,
  onSelect,
}: {
  avatar: Avatar | null;
  isSelected: boolean;
  onClose: () => void;
  onSelect: (a: Avatar) => void;
}) {
  const thumbnailUrl = resolveMediaUrl(avatar?.thumbnail_url);
  const previewVideoUrl = resolveMediaUrl(avatar?.preview_video_url);

  return (
    <Modal
      open={!!avatar}
      onClose={onClose}
      title={avatar?.name ?? ""}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {avatar?.is_premium ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Star className="w-3.5 h-3.5" />}
              onClick={() => { window.location.href = "/billing"; }}
            >
              Upgrade to Pro
            </Button>
          ) : (
            <Button
              variant={isSelected ? "success" : "primary"}
              size="sm"
              leftIcon={isSelected ? <Check className="w-3.5 h-3.5" /> : undefined}
              onClick={() => { if (avatar) { onSelect(avatar); onClose(); } }}
            >
              {isSelected ? "Selected" : "Use this Avatar"}
            </Button>
          )}
        </>
      }
    >
      {avatar && (
        <div className="flex flex-col gap-5">
          {/* Visual */}
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-surface-elevated to-surface-border flex items-center justify-center relative">
            {previewVideoUrl ? (
              <AvatarVideoPreview url={previewVideoUrl} name={avatar.name} />
            ) : thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt={avatar.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={cn(
                  "w-28 h-28 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-5xl font-bold shadow-glow-sm",
                  getGradient(avatar.name)
                )}
              >
                {avatar.name[0]}
              </div>
            )}
            {avatar.is_premium && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                <div className="text-center">
                  <Lock className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">Pro Avatar</p>
                  <p className="text-slate-300 text-xs mt-1">Upgrade to unlock</p>
                </div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {avatar.gender && (
                <Badge variant="slate" className="capitalize">{avatar.gender}</Badge>
              )}
              {avatar.style && (
                <Badge variant="brand" className="capitalize">{avatar.style}</Badge>
              )}
              {avatar.category && (
                <Badge variant="cyan" className="capitalize">{avatar.category}</Badge>
              )}
              {avatar.is_premium && (
                <Badge variant="yellow">
                  <Lock className="w-2.5 h-2.5" /> Pro only
                </Badge>
              )}
            </div>
            {avatar.description && (
              <p className="text-slate-400 text-sm leading-relaxed">{avatar.description}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AvatarsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [styleFilter, setStyleFilter] = useState("All");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<Avatar | null>(null);
  const [proModal, setProModal] = useState<Avatar | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["avatars", search, category, genderFilter, styleFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (genderFilter !== "All") p.set("gender", genderFilter.toLowerCase());
      if (styleFilter !== "All") p.set("style", styleFilter.toLowerCase());
      if (category !== "All") p.set("category", category.toLowerCase());
      p.set("page_size", "48");
      return api.get<AvatarListResponse>(`/avatars?${p}`).then((r) => r.data);
    },
    staleTime: 60_000,
  });

  const handleSelect = (avatar: Avatar) => {
    if (avatar.is_premium) {
      setProModal(avatar);
      return;
    }
    setActiveId((prev) => (prev === avatar.id ? null : avatar.id));
  };

  const handlePreview = (avatar: Avatar) => {
    setPreviewAvatar(avatar);
  };

  const clearSearch = () => setSearch("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", uploadName);
      formData.append("file", uploadFile);
      await api.post("/avatars/upload", formData);
      setCreateModal(false);
      setUploadName("");
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ["avatars"] });
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload avatar. Ensure it is a valid format and size.");
    } finally {
      setIsUploading(false);
    }
  };

  const activeCount = data?.total ?? 0;
  const hasResults = (data?.items.length ?? 0) > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Avatars</h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose a presenter for your videos. Pro avatars require an upgrade.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeId && (
            <Badge variant="green">
              <Check className="w-3 h-3" /> Avatar selected
            </Badge>
          )}
          <Badge variant="brand">
            <Sparkles className="w-3 h-3" />
            {activeCount} available
          </Badge>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setCreateModal(true)}
          >
            Create Avatar
          </Button>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            id="avatar-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search avatars by name..."
            className="input pl-10 pr-10"
            aria-label="Search avatars"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                category === cat
                  ? "bg-brand-600 border-brand-500 text-white shadow-glow-sm"
                  : "bg-surface-card border-surface-border text-slate-400 hover:text-white hover:border-slate-500"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gender + Style pills */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3 h-3" />
            Filter by:
          </div>
          <FilterPill options={GENDER_FILTERS} active={genderFilter} onChange={setGenderFilter} />
          <FilterPill options={STYLE_FILTERS} active={styleFilter} onChange={setStyleFilter} />
        </div>
      </div>

      {/* ── Result count ── */}
      {!isLoading && (
        <p className="text-xs text-slate-500">
          {search || category !== "All" || genderFilter !== "All" || styleFilter !== "All"
            ? `Showing ${data?.items.length ?? 0} of ${activeCount} avatars`
            : `${activeCount} avatars available`}
        </p>
      )}

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
              <div className="skeleton aspect-[3/4] w-full" />
              <div className="bg-surface-card p-4 space-y-2 border border-surface-border border-t-0 rounded-b-2xl">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-8 rounded-lg mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasResults ? (
        <Card>
          <EmptyState
            icon={<User className="w-7 h-7" />}
            title="No avatars found"
            description={
              search
                ? `No avatars match "${search}". Try a different name.`
                : "Try changing your filters."
            }
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data!.items.map((avatar) => (
            <AvatarCard
              key={avatar.id}
              avatar={avatar}
              isSelected={activeId === avatar.id}
              onSelect={handleSelect}
              onPreview={handlePreview}
            />
          ))}
        </div>
      )}

      {/* ── Selected avatar CTA bar (sticky bottom) ── */}
      {activeId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-4 bg-surface-card border border-brand-500/40 shadow-glow-sm rounded-2xl px-5 py-3 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center gap-2 text-sm text-white">
              <Check className="w-4 h-4 text-brand-400" />
              Avatar selected
            </div>
            <div className="w-px h-4 bg-surface-border" />
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              onClick={() => { window.location.href = "/projects"; }}
            >
              Use in project
            </Button>
            <button
              onClick={() => setActiveId(null)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Preview Modal ── */}
      <AvatarPreviewModal
        avatar={previewAvatar}
        isSelected={previewAvatar?.id === activeId}
        onClose={() => setPreviewAvatar(null)}
        onSelect={handleSelect}
      />

      {/* ── Pro Upgrade Modal ── */}
      <Modal
        open={!!proModal}
        onClose={() => setProModal(null)}
        title={proModal?.name ?? ""}
        description="This avatar requires a Pro subscription."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setProModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Star className="w-3.5 h-3.5" />}
              onClick={() => { window.location.href = "/billing"; }}
            >
              Upgrade to Pro
            </Button>
          </>
        }
      >
        {proModal && (
          <div className="flex flex-col items-center gap-4 py-2">
            <div
              className={cn(
                "w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-4xl font-bold",
                getGradient(proModal.name)
              )}
            >
              {proModal.name[0]}
            </div>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {proModal.gender && (
                  <Badge variant="slate" className="capitalize">
                    {proModal.gender}
                  </Badge>
                )}
                {proModal.style && (
                  <Badge variant="brand" className="capitalize">
                    {proModal.style}
                  </Badge>
                )}
                <Badge variant="yellow">
                  <Lock className="w-2.5 h-2.5" /> Pro only
                </Badge>
              </div>
              {proModal.description && (
                <p className="text-slate-400 text-sm mt-3 max-w-xs mx-auto">
                  {proModal.description}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
      {/* ── Create Avatar Modal ── */}
      <Modal
        open={createModal}
        onClose={() => !isUploading && setCreateModal(false)}
        title="Create Custom Avatar"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateModal(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpload}
              disabled={isUploading || !uploadFile || !uploadName}
              leftIcon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            >
              {isUploading ? "Uploading..." : "Upload Avatar"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Avatar Name</label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g. My Custom Avatar"
              className="input w-full"
              maxLength={50}
              required
              disabled={isUploading}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Avatar Image</label>
            <div className="relative">
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
                id="avatar-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="avatar-upload"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                  uploadFile ? "border-brand-500 bg-brand-500/10" : "border-surface-border bg-surface-card hover:bg-surface-elevated hover:border-slate-500",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                {uploadFile ? (
                  <div className="flex flex-col items-center gap-2 text-brand-400">
                    <Check className="w-6 h-6" />
                    <span className="text-sm font-medium">{uploadFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Upload className="w-6 h-6" />
                    <span className="text-sm font-medium">Click to upload image</span>
                    <span className="text-xs text-slate-500">JPG or PNG (max. 5MB)</span>
                  </div>
                )}
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
