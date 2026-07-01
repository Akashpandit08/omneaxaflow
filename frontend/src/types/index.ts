// ============================================================
// Shared TypeScript types — mirror backend Pydantic schemas
// ============================================================

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ---------- Projects ----------

export type ProjectStatus = "draft" | "rendering" | "completed" | "failed";

export interface SceneItem {
  id: string;
  text: string;
  duration?: number;
  transition?: string;
}

export interface Project {
  id: number;
  owner_id: number;
  title: string;
  description: string | null;
  script: string | null;
  scenes: SceneItem[] | null;
  avatar_id: number | null;
  voice_id: number | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
}

// ---------- Videos ----------

export type VideoStatus = "queued" | "processing" | "completed" | "failed";

export interface Video {
  id: number;
  project_id: number;
  project_title?: string;
  task_id: string | null;
  status: VideoStatus;
  progress_percent: number;
  audio_s3_key: string | null;
  video_s3_key: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoListResponse {
  items: Video[];
  total: number;
  page: number;
  page_size: number;
}

export interface VideoStatusResponse {
  video_id: number;
  status: VideoStatus;
  progress_percent?: number;
  error_message?: string;
}

export interface VideoDownloadResponse {
  download_url: string;
  expires_in: number;
}

// ---------- Avatars ----------

export interface Avatar {
  id: number;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  preview_video_url: string | null;
  gender: string | null;
  style: string | null;
  category: string | null;
  is_premium: boolean;
  is_active: boolean;
}

export interface AvatarListResponse {
  items: Avatar[];
  total: number;
  page: number;
  page_size: number;
}

// ---------- Voices ----------

export interface Voice {
  id: number;
  name: string;
  provider: string;
  language: string;
  accent: string | null;
  gender: string | null;
  is_premium: boolean;
}

export interface VoiceListResponse {
  items: Voice[];
  total: number;
}

// ---------- Subscriptions ----------

export type PlanTier = "free" | "pro" | "business";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";

export interface Plan {
  id: number;
  name: string;
  tier: PlanTier;
  monthly_video_limit: number;
  max_video_duration_seconds: number;
  storage_gb: number;
  price_cents: number;
  razorpay_plan_id: string | null;
}

export interface Subscription {
  id: number;
  status: SubscriptionStatus;
  plan: Plan;
  videos_used_this_period: number;
  current_period_end: string | null;
  razorpay_subscription_id: string | null;
}

export interface BillingHistory {
  id: number;
  amount_cents: number;
  status: string;
  date: string;
  razorpay_payment_id: string | null;
  razorpay_invoice_id: string | null;
  invoice_url: string | null;
}

// ---------- Dashboard ----------

export interface DashboardStatsResponse {
  total_videos: number;
  credits_remaining: number;
  total_credits: number;
  video_statuses: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

// ---------- API Keys ----------

export interface ApiKey {
  id: number;
  key_prefix: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ApiKeyCreateResponse extends ApiKey {
  full_key: string;
}

// ---------- Webhooks ----------

export interface Webhook {
  id: number;
  url: string;
  event_types: string[];
  is_active: boolean;
  created_at: string;
}

export interface WebhookCreateResponse extends Webhook {
  secret: string;
}

export interface WebhookRotateSecretResponse extends Webhook {
  secret: string;
}
