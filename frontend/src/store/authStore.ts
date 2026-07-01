/**
 * Zustand auth store — persists tokens in localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import api from "@/lib/api";

interface AuthState {
  user:            User | null;
  accessToken:     string | null;
  refreshToken:    string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;

  login:    (email: string, password: string, mfaCode?: string, backupCode?: string) => Promise<"ok" | "mfa_required">;
  register: (email: string, password: string) => Promise<void>;
  logout:   () => void;
  fetchMe:  () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
      isLoading:       false,

      login: async (email, password, mfaCode, backupCode) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/login", {
            email,
            password,
            mfa_code: mfaCode || undefined,
            backup_code: backupCode || undefined,
          });
          if (data.mfa_required) {
            return "mfa_required";
          }
          localStorage.setItem("access_token",  data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          set({
            accessToken:     data.access_token,
            refreshToken:    data.refresh_token,
            isAuthenticated: true,
          });
          await get().fetchMe();
          return "ok";
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/register", {
            email,
            password,
          });
          localStorage.setItem("access_token",  data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          set({
            accessToken:     data.access_token,
            refreshToken:    data.refresh_token,
            isAuthenticated: true,
          });
          await get().fetchMe();
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.get<User>("/auth/me");
          set({ user: data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken:     state.accessToken,
        refreshToken:    state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
