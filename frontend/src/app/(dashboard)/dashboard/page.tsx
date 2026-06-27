"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Film, Clock, CheckCircle, RefreshCw, AlertCircle, Search, 
  ChevronLeft, ChevronRight, Zap, PlayCircle, Plus
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { DashboardStatsResponse, VideoListResponse, Video } from "@/types";
import { formatDateRelative } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { LinkButton, Button } from "@/components/ui/Button";

function SkeletonStatCard() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="skeleton h-10 w-10 rounded-xl" />
      <div className="skeleton h-7 w-16 rounded" />
      <div className="skeleton h-3.5 w-24 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  
  // Pagination & Search state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageSize = 6;

  // Debounce search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page on new search
  };

  // Minimal debounce effect
  import("react").then(({ useEffect }) => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStatsResponse>("/dashboard/stats").then(r => r.data),
  });

  const { data: videosData, isLoading: loadingVideos } = useQuery({
    queryKey: ["videos", page, debouncedSearch],
    queryFn: () => api.get<VideoListResponse>(`/videos?page=${page}&page_size=${pageSize}${debouncedSearch ? `&search=${debouncedSearch}` : ""}`).then(r => r.data),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const usedPct = stats ? Math.round(((stats.total_credits - stats.credits_remaining) / Math.max(1, stats.total_credits)) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {greeting},{" "}
            <span className="text-gradient">{user?.full_name?.split(" ")[0] ?? "there"}</span> 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">Here&apos;s your video overview and recent renders.</p>
        </div>
        <LinkButton href="/projects/new" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          New project
        </LinkButton>
      </div>

      {/* ── Analytics Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <Card className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-600/10 text-brand-400">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total_videos ?? 0}</p>
                <p className="text-sm text-slate-400 mt-0.5">Total Videos</p>
              </div>
              <p className="text-xs text-slate-600">Generated across all time</p>
            </Card>

            <Card className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-600/10 text-accent-cyan">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.credits_remaining ?? 0}</p>
                <p className="text-sm text-slate-400 mt-0.5">Credits Remaining</p>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={stats ? stats.total_credits - stats.credits_remaining : 0} max={stats?.total_credits ?? 1} size="sm" className="flex-1" />
                <span className="text-[10px] text-slate-500">{usedPct}% used</span>
              </div>
            </Card>

            <Card className="flex flex-col gap-3 lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-600/10 text-accent-purple">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Video Statuses</h3>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mt-auto">
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-elevated/50 border border-surface-border">
                  <span className="text-lg font-bold text-white">{stats?.video_statuses.completed ?? 0}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Done</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-elevated/50 border border-surface-border">
                  <span className="text-lg font-bold text-white">{stats?.video_statuses.processing ?? 0}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold mt-1 flex items-center gap-1"><RefreshCw className="w-3 h-3 text-brand-400" /> Active</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-elevated/50 border border-surface-border">
                  <span className="text-lg font-bold text-white">{stats?.video_statuses.queued ?? 0}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold mt-1 flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> Wait</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-elevated/50 border border-surface-border">
                  <span className="text-lg font-bold text-white">{stats?.video_statuses.failed ?? 0}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> Fail</span>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ── Recent Videos ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-brand-400" />
            Recent Videos
          </h2>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by project name..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        {loadingVideos ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card animate-pulse space-y-4">
                <div className="skeleton aspect-video w-full rounded-lg" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : !videosData?.items.length ? (
          <Card className="text-center py-12">
            <Film className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No videos found</p>
            <p className="text-slate-500 text-sm mb-5">
              {search ? "Try a different search term." : "Create your first AI video project to get started."}
            </p>
            {!search && (
              <LinkButton href="/projects/new" variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Create project
              </LinkButton>
            )}
          </Card>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videosData.items.map((video) => (
                <Card key={video.id} className="flex flex-col p-0 overflow-hidden group">
                  <div className="aspect-video bg-gradient-to-br from-surface-elevated to-surface-border relative flex items-center justify-center border-b border-surface-border">
                    {video.status === "completed" ? (
                      <CheckCircle className="w-10 h-10 text-green-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    ) : video.status === "processing" ? (
                      <div className="flex flex-col items-center">
                        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-2" />
                        <span className="text-xs font-semibold text-brand-400">{video.progress_percent}%</span>
                      </div>
                    ) : video.status === "failed" ? (
                      <AlertCircle className="w-10 h-10 text-red-500 opacity-50" />
                    ) : (
                      <Clock className="w-10 h-10 text-slate-500 opacity-50" />
                    )}
                    
                    <div className="absolute top-2 right-2">
                      <Badge variant={
                        video.status === "completed" ? "green" : 
                        video.status === "failed" ? "red" : 
                        video.status === "processing" ? "brand" : "slate"
                      }>
                        {video.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-sm mb-1 truncate">
                        {video.project_title || `Project #${video.project_id}`}
                      </h3>
                      <p className="text-xs text-slate-400 mb-2">Created {formatDateRelative(video.created_at)}</p>
                      
                      {video.duration_seconds && (
                        <p className="text-xs text-slate-500">Duration: {video.duration_seconds}s</p>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-surface-border">
                      <LinkButton href={`/projects/${video.project_id}`} variant="secondary" size="sm" className="w-full">
                        View Project
                      </LinkButton>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {videosData.total > pageSize && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, videosData.total)} of {videosData.total} videos
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * pageSize >= videosData.total}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
