import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { 
  Avatar, 
  ApiKey, 
  ApiKeyCreateResponse, 
  Webhook, 
  WebhookCreateResponse, 
  WebhookRotateSecretResponse 
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    const workspace = useWorkspaceStore.getState().currentWorkspace;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (workspace && workspace.id) {
      config.headers['X-Workspace-ID'] = workspace.id.toString();
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = res.data;
          
          useAuthStore.setState((state) => ({
            ...state,
            accessToken: access_token,
            refreshToken: refresh_token,
          }));

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export async function uploadAvatar(file: File, name: string): Promise<Avatar> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  const { data } = await api.post<Avatar>('/avatars/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function createApiKey(name: string): Promise<ApiKeyCreateResponse> {
  const { data } = await api.post<ApiKeyCreateResponse>('/api-keys', { name });
  return data;
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const { data } = await api.get<ApiKey[]>('/api-keys');
  return data;
}

export async function revokeApiKey(id: number): Promise<void> {
  await api.delete(`/api-keys/${id}`);
}

// Webhooks
export async function createWebhook(url: string, event_types: string[]): Promise<WebhookCreateResponse> {
  const { data } = await api.post<WebhookCreateResponse>('/webhooks', { url, event_types });
  return data;
}

export async function listWebhooks(): Promise<Webhook[]> {
  const { data } = await api.get<Webhook[]>('/webhooks');
  return data;
}

export async function updateWebhook(id: number, updates: Partial<Webhook>): Promise<Webhook> {
  const { data } = await api.patch<Webhook>(`/webhooks/${id}`, updates);
  return data;
}

export async function deleteWebhook(id: number): Promise<void> {
  await api.delete(`/webhooks/${id}`);
}

export async function rotateWebhookSecret(id: number): Promise<WebhookRotateSecretResponse> {
  const { data } = await api.post<WebhookRotateSecretResponse>(`/webhooks/${id}/rotate-secret`);
  return data;
}

export { api };
