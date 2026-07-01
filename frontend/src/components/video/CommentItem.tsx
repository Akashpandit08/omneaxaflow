"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Comment } from "@/types";

function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

interface CommentItemProps {
  comment: Comment;
  onJump: (seconds: number) => void;
  onUpdate: (id: number, content: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function CommentItem({ comment, onJump, onUpdate, onDelete }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(comment.content);

  const save = async () => {
    await onUpdate(comment.id, content);
    setIsEditing(false);
  };

  return (
    <div className="border-b border-surface-border py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onJump(comment.timestamp_seconds)}
          className="rounded bg-brand-600/15 px-2 py-1 text-xs font-semibold text-brand-300 hover:bg-brand-600/25"
        >
          {formatTimestamp(comment.timestamp_seconds)}
        </button>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button size="icon" variant="ghost" onClick={save} title="Save comment">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} title="Cancel edit">
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} title="Edit comment">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(comment.id)} title="Delete comment">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-20 w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm text-slate-300">{comment.content}</p>
      )}
      <p className="mt-2 text-xs text-slate-600">{new Date(comment.created_at).toLocaleString()}</p>
    </div>
  );
}
