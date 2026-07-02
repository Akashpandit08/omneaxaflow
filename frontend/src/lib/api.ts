import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { BrandGlossary } from '@/store/glossaryStore';
import type { ImportJob } from '@/store/importStore';
import type { VoiceClone } from '@/store/voiceCloneStore';

import type { 
  Avatar, 
  ApiKey, 
  ApiKeyCreateResponse, 
  Webhook, 
  WebhookCreateResponse, 
  WebhookRotateSecretResponse 
} from '@/types';


export class ApiError extends Error {
  status?: number;
  code?: string;
  validationErrors?: unknown;

  constructor(message: string, status?: number, code?: string, validationErrors?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

function normalizeApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError(error instanceof Error ? error.message : 'Unexpected error');
  }

  const axiosError = error as any;
  const status = axiosError.response?.status;
  const detail = axiosError.response?.data?.detail;
  const message =
    typeof detail === 'string'
      ? detail
      : axiosError.response?.data?.message || axiosError.message || 'Request failed';

  return new ApiError(
    message,
    status,
    axiosError.response?.data?.code,
    status === 422 ? detail : undefined,
  );
}

const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_URL = rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`;
const API_ORIGIN = API_URL.replace(/\/api\/v1$/, '');

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|blob:|data:)/i.test(url)) return url;

  const path = url.replace(/^\/+/, '');
  if (path.startsWith('media/')) {
    return `${API_ORIGIN}/${path}`;
  }

  return `${API_ORIGIN}/media/${path}`;
}

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
    
    // Automatically let browser set Content-Type with boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(normalizeApiError(error))
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
          return Promise.reject(normalizeApiError(refreshError));
        }
      } else {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(normalizeApiError(error));
  }
);

export default api;

export async function uploadAvatar(file: File, name: string): Promise<Avatar> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  const { data } = await api.post<Avatar>('/avatars/upload', formData);
  return data;
}


export async function listVoiceClones(): Promise<VoiceClone[]> {
  const { data } = await api.get<VoiceClone[]>('/voices/clones');
  return data;
}

export async function createVoiceClone(file: File, name: string, provider = 'cartesia'): Promise<VoiceClone> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('provider', provider);
  formData.append('audio_file', file);

  const { data } = await api.post<VoiceClone>('/voices/clone', formData);
  return data;
}

export async function deleteVoiceClone(id: number): Promise<void> {
  await api.delete(`/voices/clones/${id}`);
}

export async function retrainVoiceClone(id: number): Promise<VoiceClone> {
  const { data } = await api.post<VoiceClone>(`/voices/clones/${id}/retrain`);
  return data;
}

export async function generateVoiceClonePreview(id: number): Promise<{ preview_url: string }> {
  const { data } = await api.post<{ preview_url: string }>(`/voices/clones/${id}/preview`);
  return data;
}

export async function listGlossaryTerms(): Promise<BrandGlossary[]> {
  const { data } = await api.get<{ items: BrandGlossary[] }>('/brand-glossary');
  return data.items;
}

export async function createGlossaryTerm(input: {
  term: string;
  replacement: string;
  description?: string;
}): Promise<BrandGlossary> {
  const { data } = await api.post<BrandGlossary>('/brand-glossary', input);
  return data;
}

export async function deleteGlossaryTerm(id: number): Promise<void> {
  await api.delete(`/brand-glossary/${id}`);
}

export async function uploadImportFile(file: File): Promise<ImportJob> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<ImportJob>('/imports/upload', formData);
  return data;
}

export async function processImportJob(id: number): Promise<ImportJob> {
  const { data } = await api.post<ImportJob>(`/imports/${id}/process`);
  return data;
}

export async function updateBrandingSettings(input: {
  primaryColor: string;
  customDomain?: string;
  removeWatermark: boolean;
}): Promise<void> {
  const formData = new FormData();
  formData.append('primary_color', input.primaryColor);
  formData.append('hide_renderflow_branding', String(input.removeWatermark));
  if (input.customDomain) {
    formData.append('custom_domain', input.customDomain);
  }

  await api.post('/branding', formData);
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
