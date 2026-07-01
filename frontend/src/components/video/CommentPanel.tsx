"use client";

import { FormEvent, useEffect, useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { CommentItem } from "@/components/video/CommentItem";
import { useCommentStore } from "@/store/commentStore";
import { toast } from "@/components/ui/Toast";

interface CommentPanelProps {
  videoId: number;
  currentTime?: number;
  onJumpToTime: (seconds: number) => void;
}

export function CommentPanel({ videoId, currentTime = 0, onJumpToTime }: CommentPanelProps) {
  const { comments, isLoading, fetchComments, addComment, updateComment, deleteComment } = useCommentStore();
  const [content, setContent] = useState("");
  const [timestamp, setTimestamp] = useState(Math.max(0, Math.floor(currentTime)));

  useEffect(() => {
    fetchComments(videoId);
  }, [fetchComments, videoId]);

  useEffect(() => {
    setTimestamp(Math.max(0, Math.floor(currentTime)));
  }, [currentTime]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    try {
      await addComment(videoId, timestamp, content.trim());
      setContent("");
      toast.success("Comment added");
    } catch {
      toast.error("Could not add comment");
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-400" />
          Comments
        </CardTitle>
      </CardHeader>

      <form onSubmit={submit} className="mb-4 space-y-3">
        <div className="grid grid-cols-[96px_1fr] gap-2">
          <input
            type="number"
            min={0}
            value={timestamp}
            onChange={(event) => setTimestamp(Number(event.target.value))}
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500"
            aria-label="Timestamp seconds"
          />
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Add a timestamped note"
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500"
          />
        </div>
        <Button type="submit" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
          Add Comment
        </Button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onJump={onJumpToTime}
              onUpdate={async (id, nextContent) => {
                await updateComment(id, { content: nextContent });
                toast.success("Comment updated");
              }}
              onDelete={async (id) => {
                await deleteComment(id);
                toast.success("Comment deleted");
              }}
            />
          ))
        )}
      </div>
    </Card>
  );
}
