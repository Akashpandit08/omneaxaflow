"use client";

import { useEffect, useState } from "react";
import { Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { usePermissionStore } from "@/store/permissionStore";
import type { PermissionValue } from "@/types";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: string;
  resourceId: number;
}

const PERMISSIONS: PermissionValue[] = ["view", "edit", "delete", "share"];

export function ShareModal({ isOpen, onClose, resourceType, resourceId }: ShareModalProps) {
  const { permissions, fetchPermissions, grantPermission, revokePermission } = usePermissionStore();
  const [userId, setUserId] = useState("");
  const [permission, setPermission] = useState<PermissionValue>("view");

  useEffect(() => {
    if (isOpen) fetchPermissions(resourceType, resourceId);
  }, [fetchPermissions, isOpen, resourceId, resourceType]);

  const grant = async () => {
    const parsedUserId = Number(userId);
    if (!parsedUserId) return;
    await grantPermission({ resource_type: resourceType, resource_id: resourceId, user_id: parsedUserId, permission });
    setUserId("");
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Share Access">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="User ID"
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500"
          />
          <select
            value={permission}
            onChange={(event) => setPermission(event.target.value as PermissionValue)}
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500"
          >
            {PERMISSIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <Button onClick={grant} leftIcon={<Share2 className="h-4 w-4" />}>Grant</Button>
        </div>

        <div className="rounded-lg border border-surface-border">
          {permissions.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No explicit access grants.</p>
          ) : (
            permissions.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-surface-border p-3 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-slate-200">User #{item.user_id}</p>
                  <p className="text-xs text-slate-500">{item.permission}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => revokePermission(item.id)} title="Remove access">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
