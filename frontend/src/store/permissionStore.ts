import { create } from "zustand";
import api from "@/lib/api";
import type { ContentPermission, PermissionValue } from "@/types";

interface PermissionState {
  permissions: ContentPermission[];
  isLoading: boolean;
  fetchPermissions: (resourceType: string, resourceId: number) => Promise<void>;
  grantPermission: (payload: { resource_type: string; resource_id: number; user_id: number; permission: PermissionValue }) => Promise<void>;
  revokePermission: (permissionId: number) => Promise<void>;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  isLoading: false,

  fetchPermissions: async (resourceType, resourceId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<ContentPermission[]>(`/permissions/${resourceType}:${resourceId}`);
      set({ permissions: data });
    } finally {
      set({ isLoading: false });
    }
  },

  grantPermission: async (payload) => {
    await api.post("/permissions", payload);
    await get().fetchPermissions(payload.resource_type, payload.resource_id);
  },

  revokePermission: async (permissionId) => {
    await api.delete(`/permissions/${permissionId}`);
    set({ permissions: get().permissions.filter((item) => item.id !== permissionId) });
  },
}));
