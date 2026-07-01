import { create } from "zustand";

export interface VideoTranslation {
  id: number;
  video_id: number;
  workspace_id: number;
  source_language: string;
  target_language: string;
  translated_script: string | null;
  voice_id: number | null;
  status: "queued" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface TranslationStoreState {
  translations: VideoTranslation[];
  isLoading: boolean;
  setTranslations: (translations: VideoTranslation[]) => void;
  addTranslation: (translation: VideoTranslation) => void;
  updateTranslation: (id: number, updates: Partial<VideoTranslation>) => void;
  setLoading: (loading: boolean) => void;
}

export const useTranslationStore = create<TranslationStoreState>((set) => ({
  translations: [],
  isLoading: false,
  setTranslations: (translations) => set({ translations }),
  addTranslation: (translation) => set((state) => ({ translations: [translation, ...state.translations] })),
  updateTranslation: (id, updates) => set((state) => ({
    translations: state.translations.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
