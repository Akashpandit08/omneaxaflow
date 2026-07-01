import { create } from "zustand";

export interface VoiceClone {
  id: number;
  workspace_id: number;
  user_id: number;
  name: string;
  provider: string;
  provider_voice_id: string | null;
  sample_audio_url: string;
  preview_url: string | null;
  status: "uploaded" | "training" | "ready" | "failed";
  created_at: string;
  updated_at: string;
}

interface VoiceCloneState {
  clones: VoiceClone[];
  isLoading: boolean;
  setClones: (clones: VoiceClone[]) => void;
  addClone: (clone: VoiceClone) => void;
  updateClone: (id: number, updates: Partial<VoiceClone>) => void;
  removeClone: (id: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useVoiceCloneStore = create<VoiceCloneState>((set) => ({
  clones: [],
  isLoading: false,
  setClones: (clones) => set({ clones }),
  addClone: (clone) => set((state) => ({ clones: [clone, ...state.clones] })),
  updateClone: (id, updates) => set((state) => ({
    clones: state.clones.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  removeClone: (id) => set((state) => ({
    clones: state.clones.filter(c => c.id !== id)
  })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
