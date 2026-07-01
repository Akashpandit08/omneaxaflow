import { create } from "zustand";

export interface BrandGlossary {
  id: number;
  workspace_id: number;
  term: string;
  replacement: string;
  description: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

interface GlossaryStoreState {
  terms: BrandGlossary[];
  isLoading: boolean;
  setTerms: (terms: BrandGlossary[]) => void;
  addTerm: (term: BrandGlossary) => void;
  updateTerm: (id: number, updates: Partial<BrandGlossary>) => void;
  removeTerm: (id: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useGlossaryStore = create<GlossaryStoreState>((set) => ({
  terms: [],
  isLoading: false,
  setTerms: (terms) => set({ terms }),
  addTerm: (term) => set((state) => ({ terms: [...state.terms, term] })),
  updateTerm: (id, updates) => set((state) => ({
    terms: state.terms.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTerm: (id) => set((state) => ({
    terms: state.terms.filter(t => t.id !== id)
  })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
