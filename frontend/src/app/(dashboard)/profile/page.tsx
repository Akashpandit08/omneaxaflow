"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User, Mail, Lock, Shield, Trash2, Camera } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Subscription } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { getInitials } from "@/lib/utils";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email:     z.string().email("Invalid email"),
});
const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Required"),
    new_password:     z.string().min(8, "At least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path:    ["confirm_password"],
  });

type ProfileForm  = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<Subscription>("/subscriptions/me").then((r) => r.data),
  });

  const initials = getInitials(user?.full_name ?? "??");

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name ?? "", email: user?.email ?? "" },
  });

  useEffect(() => {
    if (user) profileForm.reset({ full_name: user.full_name, email: user.email });
  }, [user, profileForm]);

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.patch("/auth/me", data),
    onSuccess: () => { toast.success("Profile updated"); fetchMe(); },
    onError:   () => toast.error("Failed to update profile"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordForm) => api.post("/auth/change-password", data),
    onSuccess: () => { toast.success("Password changed"); passwordForm.reset(); },
    onError:   () => toast.error("Current password is incorrect"),
  });

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Profile</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your account settings and preferences.</p>
      </div>

      {/* Avatar + name card */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xl font-bold shadow-glow-sm">
              {initials}
            </div>
            <button
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-elevated border border-surface-border flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Change avatar"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <div>
            <p className="font-semibold text-white text-base">{user?.full_name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {subscription && <StatusBadge status={subscription.plan.tier} />}
              {user?.is_superuser && (
                <Badge variant="purple">
                  <Shield className="w-2.5 h-2.5" /> Admin
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand-400" />
            <CardTitle>Personal Information</CardTitle>
          </div>
        </CardHeader>
        <form
          onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))}
          className="space-y-4"
        >
          <Input
            label="Full name"
            leftIcon={<User className="w-4 h-4" />}
            error={profileForm.formState.errors.full_name?.message}
            {...profileForm.register("full_name")}
          />
          <Input
            label="Email address"
            type="email"
            leftIcon={<Mail className="w-4 h-4" />}
            error={profileForm.formState.errors.email?.message}
            {...profileForm.register("email")}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={updateProfileMutation.isPending}
          >
            Save changes
          </Button>
        </form>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-400" />
            <CardTitle>Change Password</CardTitle>
          </div>
        </CardHeader>
        <form
          onSubmit={passwordForm.handleSubmit((d) => changePasswordMutation.mutate(d))}
          className="space-y-4"
        >
          <Input
            label="Current password"
            type="password"
            error={passwordForm.formState.errors.current_password?.message}
            {...passwordForm.register("current_password")}
          />
          <Input
            label="New password"
            type="password"
            hint="At least 8 characters"
            error={passwordForm.formState.errors.new_password?.message}
            {...passwordForm.register("new_password")}
          />
          <Input
            label="Confirm new password"
            type="password"
            error={passwordForm.formState.errors.confirm_password?.message}
            {...passwordForm.register("confirm_password")}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={changePasswordMutation.isPending}
          >
            Update password
          </Button>
        </form>
      </Card>

      {/* Subscription summary */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {[
              { label: "Plan",        value: subscription.plan.name },
              { label: "Status",      value: <StatusBadge status={subscription.status} /> },
              { label: "Videos used", value: `${subscription.videos_used_this_period} / ${subscription.plan.monthly_video_limit}` },
              { label: "Storage",     value: `${subscription.plan.storage_gb} GB` },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-slate-500 text-xs mb-0.5">{item.label}</p>
                <div className="text-white font-medium">{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-red-900/40 bg-red-900/5">
        <CardHeader>
          <div>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
            <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
          </div>
        </CardHeader>
        <Button
          variant="danger"
          size="sm"
          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleteOpen(true)}
        >
          Delete account
        </Button>
      </Card>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => toast.error("Account deletion not available in MVP")}
        title="Delete your account?"
        message="All projects, videos, and data will be permanently deleted. This cannot be undone."
        confirmLabel="Yes, delete my account"
        variant="danger"
      />
    </div>
  );
}
