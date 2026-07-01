import { create } from "zustand";
import api from "@/lib/api";
import type { Project, Template, TemplateListResponse } from "@/types";

interface TemplateState {
  templates: Template[];
  total: number;
  isLoading: boolean;
  fetchTemplates: (search?: string) => Promise<void>;
  createTemplate: (payload: { project_id: number; name: string; description?: string; is_shared: boolean }) => Promise<void>;
  useTemplate: (templateId: number) => Promise<Project>;
  deleteTemplate: (templateId: number) => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  total: 0,
  isLoading: false,

  fetchTemplates: async (search) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<TemplateListResponse>("/templates", { params: { search } });
      set({ templates: data.items, total: data.total });
    } finally {
      set({ isLoading: false });
    }
  },

  createTemplate: async (payload) => {
    await api.post("/templates", payload);
    await get().fetchTemplates();
  },

  useTemplate: async (templateId) => {
    const { data } = await api.post<Project>(`/templates/${templateId}/use`);
    return data;
  },

  deleteTemplate: async (templateId) => {
    await api.delete(`/templates/${templateId}`);
    set({ templates: get().templates.filter((item) => item.id !== templateId) });
  },
}));
