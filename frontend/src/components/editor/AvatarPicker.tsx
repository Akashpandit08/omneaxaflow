"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Lock, Check, ChevronRight, Search, X } from "lucide-react";
import api from "@/lib/api";
import type { Avatar, AvatarListResponse } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Props {
  selectedId: number | null;
  onSelect: (avatar: Avatar) => void;
}

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
  S: "from-sky-500 to-cyan-500",
  default: "from-brand-600 to-violet-600",
};
const getGradient = (name: string) =>
  GRADIENTS[name[0]?.toUpperCase()] ?? GRADIENTS.default;

function AvatarThumb({
  avatar,
  size = "sm",
}: {
  avatar: Avatar;
  size?: "sm" | "md";
}) {
  const cls = size === "md" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm";
  if (avatar.thumbnail_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar.thumbnail_url}
        alt={avatar.name}
        className={cn("rounded-full object-cover flex-shrink-0", cls)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold flex-shrink-0",
        getGradient(avatar.name),
        cls
      )}
    >
      {avatar.name[0]}
    </div>
  );
}

export function AvatarPicker({ selectedId, onSelect }: Props) {
  const [expandModal, setExpandModal] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["avatars"],
    queryFn: () =>
      api.get<AvatarListResponse>("/avatars?page_size=100").then((r) => r.data),
    staleTime: 60_000,
  });

  const selectedAvatar = data?.items.find((a) => a.id === selectedId);

  // Client-side search filter for the modal
  const filteredItems = useMemo(() => {
    const all = data?.items ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.style?.toLowerCase().includes(q)
    );
  }, [data?.items, search]);

  const handleSelect = (avatar: Avatar) => {
    if (!avatar.is_premium) {
      onSelect(avatar);
      setExpandModal(false);
    }
  };

  return (
    <>
      <div className="card space-y-3 !p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-brand-400" />
            <span className="font-semibold text-white text-sm">Avatar</span>
          </div>
          <button
            onClick={() => setExpandModal(true)}
            className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Browse all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Selected preview */}
        {selectedAvatar ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-brand-600/10 border border-brand-600/20">
            <AvatarThumb avatar={selectedAvatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedAvatar.name}</p>
              <p className="text-xs text-slate-500 capitalize">
                {selectedAvatar.category ?? selectedAvatar.style ?? "standard"}
              </p>
            </div>
            <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
          </div>
        ) : (
          <button
            onClick={() => setExpandModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed border-surface-border hover:border-brand-600/40 text-slate-500 hover:text-brand-400 text-xs transition-all"
          >
            <User className="w-4 h-4" />
            Choose an avatar
          </button>
        )}

        {/* Mini grid — first 6 free avatars */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton rounded-xl h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(data?.items ?? [])
              .filter((a) => !a.is_premium)
              .slice(0, 6)
              .map((avatar) => {
                const isSelected = avatar.id === selectedId;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => handleSelect(avatar)}
                    aria-pressed={isSelected}
                    aria-label={avatar.name}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-xs group",
                      isSelected
                        ? "border-brand-500 bg-brand-600/15 shadow-glow-sm"
                        : "border-surface-border hover:border-slate-500 hover:bg-surface-elevated cursor-pointer"
                    )}
                  >
                    <div className="transition-transform group-hover:scale-110">
                      <AvatarThumb avatar={avatar} size="sm" />
                    </div>
                    <span
                      className={cn(
                        "truncate w-full text-center leading-none",
                        isSelected ? "text-brand-300" : "text-slate-400"
                      )}
                    >
                      {avatar.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* ── Full Browse Modal ── */}
      <Modal
        open={expandModal}
        onClose={() => { setExpandModal(false); setSearch(""); }}
        title="Choose Avatar"
        description="Select a presenter for your video."
        size="lg"
      >
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search avatars..."
            className="input pl-10 pr-9"
            aria-label="Search avatars"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="col-span-3 text-center py-10 text-slate-500 text-sm">
              No avatars match &ldquo;{search}&rdquo;
            </div>
          ) : (
            filteredItems.map((avatar) => {
              const isSelected = avatar.id === selectedId;
              return (
                <button
                  key={avatar.id}
                  onClick={() => handleSelect(avatar)}
                  disabled={avatar.is_premium}
                  className={cn(
                    "relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-left",
                    isSelected
                      ? "border-brand-500 bg-brand-600/15"
                      : "border-surface-border hover:border-slate-500 hover:bg-surface-elevated",
                    avatar.is_premium ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  <AvatarThumb avatar={avatar} size="md" />
                  <div className="text-center w-full">
                    <p className="font-medium text-white text-sm truncate">{avatar.name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                      {avatar.gender && (
                        <Badge variant="slate" className="text-[10px] capitalize">
                          {avatar.gender}
                        </Badge>
                      )}
                      {avatar.category && (
                        <Badge variant="cyan" className="text-[10px] capitalize">
                          {avatar.category}
                        </Badge>
                      )}
                      {avatar.is_premium && (
                        <Badge variant="yellow" className="text-[10px]">
                          <Lock className="w-2 h-2" /> Pro
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <p className="text-xs text-slate-600 text-center mt-4">
          {filteredItems.length} avatar{filteredItems.length !== 1 ? "s" : ""} shown
          {search ? ` for "${search}"` : ""}
        </p>
      </Modal>
    </>
  );
}
