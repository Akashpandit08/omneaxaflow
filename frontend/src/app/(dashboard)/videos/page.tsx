"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Download, RefreshCw, AlertCircle, CheckCircle, Clock, Search, X } from "lucide-react";
import api from "@/lib/api";
import type { VideoListResponse, Video, VideoDownloadResponse } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

function VideoStatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return <Badge variant="green"><CheckCircle className="w-3 h-3 mr-1" /> Ready</Badge>;
  }
  if (status === "processing") {
    return <Badge variant="brand"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Rendering</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="red"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
  }
  return <Badge variant="slate"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>;
}

function VideoCard({ video, onRetry, onDownload }: { video: Video, onRetry: (id: number) => void, onDownload: (id: number) => void }) {
  return (
    <Card className="flex flex-col overflow-hidden group">
      {/* Visual placeholder */}
      <div className="aspect-video bg-gradient-to-br from-surface-elevated to-surface-border relative flex items-center justify-center border-b border-surface-border">
        {video.status === "completed" ? (
          <Film className="w-10 h-10 text-slate-500 opacity-50" />
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
          <VideoStatusBadge status={video.status} />
        </div>
      </div>
      
      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-white text-sm mb-1">Project #{video.project_id}</h3>
          <p className="text-xs text-slate-400 mb-2">Created: {new Date(video.created_at).toLocaleDateString()}</p>
          {video.duration_seconds && (
            <p className="text-xs text-slate-500">Duration: {video.duration_seconds}s</p>
          )}
          {video.status === "failed" && video.error_message && (
            <p className="text-[10px] text-red-400 font-mono bg-red-900/20 px-2 py-1 rounded mt-2 line-clamp-2">
              {video.error_message}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-surface-border flex gap-2">
          {video.status === "completed" && (
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => onDownload(video.id)}
            >
              Download
            </Button>
          )}
          {video.status === "failed" && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => onRetry(video.id)}
            >
              Retry
            </Button>
          )}
          {(video.status === "queued" || video.status === "processing") && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full opacity-50 cursor-not-allowed"
              disabled
            >
              Processing...
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function VideosPage() {
  const qc = useQueryClient();
  const [downloading, setDownloading] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["videos-list"],
    queryFn: () => api.get<VideoListResponse>("/videos").then(r => r.data),
    refetchInterval: (query) => {
      // Refresh if any videos are processing
      const hasActive = query.state.data?.items.some(v => v.status === "processing" || v.status === "queued");
      return hasActive ? 3000 : false;
    }
  });

  const handleDownload = async (id: number) => {
    setDownloading(id);
    try {
      const { data } = await api.get<VideoDownloadResponse>(`/videos/${id}/download`);
      window.open(data.download_url, "_blank");
      toast.success("Download started");
    } catch {
      toast.error("Could not generate download link");
    } finally {
      setDownloading(null);
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await api.post(`/videos/${id}/retry`);
      qc.invalidateQueries({ queryKey: ["videos-list"] });
      toast.success("Video re-queued for rendering");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to retry video");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Your Videos</h1>
          <p className="text-sm text-slate-400 mt-1">Manage and download your rendered videos.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse border border-surface-border">
              <div className="skeleton aspect-video w-full" />
              <div className="bg-surface-card p-4 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-8 rounded-lg mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.items.length ? (
        <Card>
          <EmptyState
            icon={<Film className="w-7 h-7" />}
            title="No videos yet"
            description="You haven't rendered any videos yet. Go to your projects to create one."
            action={
              <Button
                variant="primary"
                onClick={() => { window.location.href = "/projects"; }}
              >
                Go to Projects
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.items.map(video => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onRetry={handleRetry} 
              onDownload={handleDownload} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
