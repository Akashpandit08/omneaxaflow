import { create } from "zustand";
import api from "@/lib/api";
import type { Comment } from "@/types";

interface CommentState {
  comments: Comment[];
  isLoading: boolean;
  fetchComments: (videoId: number) => Promise<void>;
  addComment: (videoId: number, timestamp_seconds: number, content: string) => Promise<void>;
  updateComment: (commentId: number, payload: Partial<Pick<Comment, "timestamp_seconds" | "content">>) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  isLoading: false,

  fetchComments: async (videoId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Comment[]>(`/videos/${videoId}/comments`);
      set({ comments: data });
    } finally {
      set({ isLoading: false });
    }
  },

  addComment: async (videoId, timestamp_seconds, content) => {
    await api.post(`/videos/${videoId}/comments`, { timestamp_seconds, content });
    await get().fetchComments(videoId);
  },

  updateComment: async (commentId, payload) => {
    const { data } = await api.put<Comment>(`/comments/${commentId}`, payload);
    set({ comments: get().comments.map((item) => (item.id === commentId ? data : item)) });
  },

  deleteComment: async (commentId) => {
    await api.delete(`/comments/${commentId}`);
    set({ comments: get().comments.filter((item) => item.id !== commentId) });
  },
}));
