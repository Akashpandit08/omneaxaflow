import { create } from "zustand";

export interface ImportJob {
  id: number;
  workspace_id: number;
  user_id: number;
  project_id: number | null;
  file_name: string;
  file_type: string;
  file_url: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  parsed_content: any;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ImportStoreState {
  jobs: ImportJob[];
  isLoading: boolean;
  setJobs: (jobs: ImportJob[]) => void;
  addJob: (job: ImportJob) => void;
  updateJob: (id: number, updates: Partial<ImportJob>) => void;
  setLoading: (loading: boolean) => void;
}

export const useImportStore = create<ImportStoreState>((set) => ({
  jobs: [],
  isLoading: false,
  setJobs: (jobs) => set({ jobs }),
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJob: (id, updates) => set((state) => ({
    jobs: state.jobs.map(j => j.id === id ? { ...j, ...updates } : j)
  })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
