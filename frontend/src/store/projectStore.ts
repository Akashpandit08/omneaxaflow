/**
 * Zustand project store for managing current project editor state.
 */

import { create } from "zustand";
import type { Avatar, Project, SceneItem, Voice } from "@/types";

interface ProjectEditorState {
  project: Partial<Project> | null;
  selectedAvatar: Avatar | null;
  selectedVoice: Voice | null;
  isDirty: boolean;

  setProject: (p: Partial<Project>) => void;
  updateScript: (script: string) => void;
  updateScenes: (scenes: SceneItem[]) => void;
  setAvatar: (avatar: Avatar) => void;
  setVoice: (voice: Voice) => void;
  markClean: () => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectEditorState>((set) => ({
  project: null,
  selectedAvatar: null,
  selectedVoice: null,
  isDirty: false,

  setProject: (p) =>
    set({ project: p, isDirty: false }),

  updateScript: (script) =>
    set((s) => ({ project: { ...s.project, script }, isDirty: true })),

  updateScenes: (scenes) =>
    set((s) => ({ project: { ...s.project, scenes }, isDirty: true })),

  setAvatar: (avatar) =>
    set((s) => ({
      selectedAvatar: avatar,
      project: { ...s.project, avatar_id: avatar.id },
      isDirty: true,
    })),

  setVoice: (voice) =>
    set((s) => ({
      selectedVoice: voice,
      project: { ...s.project, voice_id: voice.id },
      isDirty: true,
    })),

  markClean: () => set({ isDirty: false }),

  reset: () =>
    set({ project: null, selectedAvatar: null, selectedVoice: null, isDirty: false }),
}));
