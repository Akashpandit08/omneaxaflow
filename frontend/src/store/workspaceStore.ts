import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
}

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      workspaces: [],
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
    }),
    {
      name: 'omneaxaflow-workspace-storage',
    }
  )
);
