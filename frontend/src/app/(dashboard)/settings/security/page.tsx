"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/store/authStore";

interface MfaSetup {
  secret: string;
  otp_uri: string;
  qr_image: string;
}

export default function SecuritySettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const beginSetup = async () => {
    const { data } = await api.post<MfaSetup>("/auth/mfa/setup");
    setSetup(data);
  };

  const verify = async () => {
    const { data } = await api.post<{ backup_codes: string[] }>("/auth/mfa/verify", { code });
    setBackupCodes(data.backup_codes);
    setSetup(null);
    setCode("");
    await fetchMe();
    toast.success("MFA enabled");
  };

  const disable = async () => {
    await api.post("/auth/mfa/disable", { code });
    setCode("");
    await fetchMe();
    toast.success("MFA disabled");
  };

  const regenerate = async () => {
    const { data } = await api.post<{ backup_codes: string[] }>("/auth/mfa/backup-codes", { code });
    setBackupCodes(data.backup_codes);
    setCode("");
    toast.success("Backup codes regenerated");
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security</h1>
        <p className="text-sm text-slate-400 mt-1">Manage multi-factor authentication for your account.</p>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Authenticator App</h2>
            <p className="text-sm text-slate-400">Status: {user?.mfa_enabled ? "Enabled" : "Disabled"}</p>
          </div>
          {!user?.mfa_enabled && <Button onClick={beginSetup}>Enable MFA</Button>}
        </div>

        {setup && (
          <div className="space-y-4">
            <img src={setup.qr_image} alt="MFA QR code" className="h-44 w-44 rounded-lg bg-white p-2" />
            <p className="text-sm text-slate-400">Secret: <span className="font-mono text-slate-200">{setup.secret}</span></p>
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="6-digit code" className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500" />
            <Button onClick={verify}>Verify and Enable</Button>
          </div>
        )}

        {user?.mfa_enabled && (
          <div className="space-y-3">
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Authenticator code" className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500" />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={regenerate}>Regenerate Backup Codes</Button>
              <Button variant="danger" onClick={disable}>Disable MFA</Button>
            </div>
          </div>
        )}

        {backupCodes.length > 0 && (
          <div className="mt-5 rounded-lg border border-surface-border p-4">
            <h3 className="mb-2 text-sm font-semibold text-white">Backup Codes</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {backupCodes.map((item) => <code key={item} className="rounded bg-surface-elevated px-2 py-1 text-sm text-slate-200">{item}</code>)}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
