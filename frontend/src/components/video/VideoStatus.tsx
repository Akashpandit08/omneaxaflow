"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download, CheckCircle, AlertCircle, RefreshCw,
  Clock, ExternalLink, Play, Check, X, CheckSquare
} from "lucide-react";
import api from "@/lib/api";
import type { ProjectStatus, VideoDownloadResponse, VideoStatusResponse } from "@/types";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface Props {
  projectId:     number;
  projectStatus: ProjectStatus;
  videoId?:      number;
}

// ─── Pipeline Stepper Stages ─────────────────────────────────────────────────

const STAGES = [
  { threshold: 5,   label: "Script",    sub: "Validating project" },
  { threshold: 25,  label: "Voice",     sub: "Generating speech" },
  { threshold: 50,  label: "Avatar",    sub: "Animating avatar" },
  { threshold: 55,  label: "Audio",     sub: "Uploading audio" },
  { threshold: 85,  label: "Render",    sub: "FFmpeg compositing" },
  { threshold: 95,  label: "Upload",    sub: "Saving to S3" },
  { threshold: 100, label: "Done",      sub: "Ready to view" },
];

function PipelineStepper({ progress }: { progress: number }) {
  // Find current active stage index
  const activeIdx = STAGES.findIndex(s => progress <= s.threshold);
  const currentStage = activeIdx === -1 ? STAGES.length - 1 : activeIdx;

  return (
    <div className="flex items-center justify-between mt-4 mb-2">
      {STAGES.map((stage, idx) => {
        const isPast   = progress >= stage.threshold;
        const isActive = progress < stage.threshold && (idx === 0 || progress >= STAGES[idx-1].threshold);
        
        return (
          <div key={stage.label} className="flex flex-col items-center gap-1.5 flex-1 relative">
            {/* Connector line (not on first item) */}
            {idx !== 0 && (
              <div className="absolute top-3 right-[50%] left-[-50%] h-[2px] bg-surface-elevated -z-10">
                <div 
                  className="h-full bg-brand-500 transition-all duration-500 ease-out" 
                  style={{ width: isPast ? '100%' : isActive ? '50%' : '0%' }}
                />
              </div>
            )}
            
            {/* Circle icon */}
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors border-2",
              isPast 
                ? "bg-brand-500 border-brand-500 text-white" 
                : isActive 
                  ? "bg-brand-900 border-brand-500 text-brand-300 shadow-[0_0_10px_rgba(var(--brand-500-rgb),0.5)]" 
                  : "bg-surface-elevated border-surface-border text-slate-500"
            )}>
              {isPast ? <Check className="w-3.5 h-3.5" /> : isActive ? <RefreshCw className="w-3 h-3 animate-spin" /> : idx + 1}
            </div>
            
            {/* Label */}
            <div className="text-center">
              <p className={cn(
                "text-[10px] font-medium leading-none",
                isPast || isActive ? "text-white" : "text-slate-500"
              )}>
                {stage.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VideoStatusPanel({ projectId, projectStatus, videoId }: Props) {
  const qc             = useQueryClient();
  const [downloading,  setDownloading] = useState(false);
  const [retrying,     setRetrying]    = useState(false);

  // Poll video status more frequently when active
  const { data: statusData } = useQuery({
    queryKey: ["video-status", videoId],
    queryFn: () =>
      videoId
        ? api.get<VideoStatusResponse>(`/videos/${videoId}/status`).then((r) => r.data)
        : null,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return (s === "queued" || s === "processing") ? 2000 : false;
    },
    enabled: !!videoId,
  });

  const effectiveStatus = statusData?.status ?? (
    projectStatus === "rendering" ? "processing" :
    projectStatus === "completed" ? "completed"  :
    projectStatus === "failed"    ? "failed"      : "queued"
  );
  
  const progressPercent = statusData?.progress_percent ?? 0;

  const isQueued    = effectiveStatus === "queued";
  const isRendering = effectiveStatus === "processing";
  const isComplete  = effectiveStatus === "completed";
  const isFailed    = effectiveStatus === "failed";

  const handleDownload = async () => {
    if (!videoId) {
      toast.error("Video ID not available yet");
      return;
    }
    setDownloading(true);
    try {
      const { data } = await api.get<VideoDownloadResponse>(`/videos/${videoId}/download`);
      window.open(data.download_url, "_blank");
      toast.success("Download started");
    } catch {
      toast.error("Could not generate download link. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleRetry = async () => {
    if (!videoId) return;
    setRetrying(true);
    try {
      await api.post(`/videos/${videoId}/retry`);
      qc.invalidateQueries({ queryKey: ["video-status", videoId] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Video re-queued for rendering");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to retry video render");
    } finally {
      setRetrying(false);
    }
  };

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["project", projectId] });
    toast.info("Refreshed status");
  };

  return (
    <div className={cn(
      "card border-l-4 transition-colors",
      isQueued    && "border-l-brand-500 bg-brand-900/5",
      isRendering && "border-l-yellow-500 bg-yellow-900/5",
      isComplete  && "border-l-accent-green bg-green-900/5",
      isFailed    && "border-l-accent-red bg-red-900/5",
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: status info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
            isQueued    && "bg-brand-600/20",
            isRendering && "bg-yellow-500/20",
            isComplete  && "bg-green-500/20",
            isFailed    && "bg-red-500/20",
          )}>
            {isQueued    && <Clock       className="w-4 h-4 text-brand-400" />}
            {isRendering && <RefreshCw   className="w-4 h-4 text-yellow-400 animate-spin" />}
            {isComplete  && <CheckCircle className="w-4 h-4 text-accent-green" />}
            {isFailed    && <AlertCircle className="w-4 h-4 text-accent-red" />}
          </div>

          <div className="flex-1 min-w-0">
            {isQueued && (
              <>
                <p className="font-semibold text-white text-sm">Queued for rendering</p>
                <p className="text-xs text-slate-400 mt-0.5">Your video is in the queue. Processing will start shortly.</p>
              </>
            )}

            {isRendering && (
              <>
                <p className="font-semibold text-white text-sm">Rendering in progress…</p>
                <div className="mt-1 mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>{progressPercent}% Complete</span>
                    <span>Est. ~{(100 - progressPercent) > 50 ? "2 min" : "1 min"}</span>
                  </div>
                  <Progress
                    value={progressPercent}
                    size="sm"
                    color="yellow"
                  />
                  
                  {/* Pipeline Stepper UI */}
                  <div className="mt-6 border-t border-surface-border pt-4">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">Pipeline Status</p>
                    <PipelineStepper progress={progressPercent} />
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2">You can safely leave this page. We'll notify you when it's done.</p>
              </>
            )}

            {isComplete && (
              <>
                <p className="font-semibold text-white text-sm">Your video is ready!</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rendering complete. Download your video or share it directly.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="green"><CheckSquare className="w-3 h-3 mr-1" /> HD 1080p</Badge>
                  <Badge variant="slate">MP4</Badge>
                </div>
              </>
            )}

            {isFailed && (
              <>
                <p className="font-semibold text-white text-sm">Render failed</p>
                {statusData?.error_message ? (
                  <p className="text-xs text-red-400 mt-0.5 font-mono bg-red-900/20 px-2 py-1 rounded mt-2 line-clamp-2 border border-red-900/50">
                    {statusData.error_message}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Something went wrong during rendering. Please try again.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
          {isComplete && (
            <>
              <Button
                variant="success"
                size="sm"
                loading={downloading}
                onClick={handleDownload}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast.info("Share functionality coming soon")}
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Share
              </Button>
            </>
          )}

          {isFailed && (
            <Button
              variant="secondary"
              size="sm"
              loading={retrying}
              onClick={handleRetry}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry Render
            </Button>
          )}

          {(isQueued || isRendering) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Ensure Badge is defined or imported, providing a simple fallback component if not
function Badge({ children, variant = 'slate', className }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
      variant === 'green' && "bg-green-500/10 text-green-400 border border-green-500/20",
      variant === 'slate' && "bg-slate-500/10 text-slate-400 border border-slate-500/20",
      className
    )}>
      {children}
    </span>
  );
}
