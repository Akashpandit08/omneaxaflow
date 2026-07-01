"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import api from "@/lib/api";
import type { AuditLogListResponse } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [resource, setResource] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", action, resource],
    queryFn: () => api.get<AuditLogListResponse>("/audit-logs", { params: { action: action || undefined, resource: resource || undefined } }).then((res) => res.data),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs</h1>
        <p className="text-sm text-slate-400 mt-1">Review critical workspace activity.</p>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Filter action" className="w-full rounded-lg border border-surface-border bg-surface-elevated py-2 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-brand-500" />
          </div>
          <input value={resource} onChange={(event) => setResource(event.target.value)} placeholder="Resource type" className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-border text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Resource</th>
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">IP</th>
                <th className="py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="py-6 text-slate-500" colSpan={5}>Loading...</td></tr>
              ) : data?.items.length ? (
                data.items.map((log) => (
                  <tr key={log.id} className="border-b border-surface-border last:border-b-0">
                    <td className="py-3 pr-4"><Badge variant="slate">{log.action}</Badge></td>
                    <td className="py-3 pr-4 text-slate-300">{log.resource_type || "-"} {log.resource_id ? `#${log.resource_id}` : ""}</td>
                    <td className="py-3 pr-4 text-slate-400">{log.user_id ? `#${log.user_id}` : "-"}</td>
                    <td className="py-3 pr-4 text-slate-400">{log.ip_address || "-"}</td>
                    <td className="py-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr><td className="py-6 text-slate-500" colSpan={5}>No audit events found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
