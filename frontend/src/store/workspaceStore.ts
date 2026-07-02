import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

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
  fetchWorkspaces: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      currentWorkspace: null,
      workspaces: [],
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      fetchWorkspaces: async () => {
        try {
          const { data } = await api.get<Workspace[]>('/workspaces');
          set({ workspaces: data });
          const { currentWorkspace } = get();
          if (data.length > 0) {
            if (!currentWorkspace || !data.find(w => w.id === currentWorkspace.id)) {
              set({ currentWorkspace: data[0] });
            }
          } else {
            set({ currentWorkspace: null });
          }
        } catch (error) {
          console.error("Failed to fetch workspaces", error);
        }
      },
    }),
    {
      name: 'omneaxaflow-workspace-storage',
    }
  )
);
