import { create } from "zustand";

export interface SCORMPackage {
  id: number;
  video_id: number;
  workspace_id: number;
  package_version: string;
  manifest_url: string | null;
  zip_url: string | null;
  status: "processing" | "ready" | "failed";
  created_at: string;
  updated_at: string;
}

interface SCORMState {
  packages: Record<number, SCORMPackage[]>; // video_id -> SCORMPackage[]
  isLoading: boolean;
  setPackages: (videoId: number, packages: SCORMPackage[]) => void;
  addPackage: (videoId: number, pkg: SCORMPackage) => void;
  updatePackage: (videoId: number, pkgId: number, updates: Partial<SCORMPackage>) => void;
  removePackage: (videoId: number, pkgId: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useScormStore = create<SCORMState>((set) => ({
  packages: {},
  isLoading: false,
  setPackages: (videoId, packages) => set((state) => ({ 
    packages: { ...state.packages, [videoId]: packages } 
  })),
  addPackage: (videoId, pkg) => set((state) => ({ 
    packages: { ...state.packages, [videoId]: [...(state.packages[videoId] || []), pkg] } 
  })),
  updatePackage: (videoId, pkgId, updates) => set((state) => {
    const videoPackages = state.packages[videoId] || [];
    return {
      packages: {
        ...state.packages,
        [videoId]: videoPackages.map(p => p.id === pkgId ? { ...p, ...updates } : p)
      }
    };
  }),
  removePackage: (videoId, pkgId) => set((state) => {
    const videoPackages = state.packages[videoId] || [];
    return {
      packages: {
        ...state.packages,
        [videoId]: videoPackages.filter(p => p.id !== pkgId)
      }
    };
  }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
