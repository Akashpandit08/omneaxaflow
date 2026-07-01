"use client";

import { useEffect, useState } from "react";
import { CopyPlus, Search, Trash2, Users, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { useTemplateStore } from "@/store/templateStore";

export default function TemplatesPage() {
  const router = useRouter();
  const { templates, isLoading, fetchTemplates, useTemplate, deleteTemplate } = useTemplateStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTemplates(search);
  }, [fetchTemplates, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Templates</h1>
          <p className="text-sm text-slate-400 mt-1">Reuse proven project setups across your workspace.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates"
            className="w-full rounded-lg border border-surface-border bg-surface-card py-2 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading templates...</p>
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState icon={<CopyPlus className="h-7 w-7" />} title="No templates yet" description="Save a project as a template to reuse it later." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">{template.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{template.description || "No description"}</p>
                </div>
                <Badge variant={template.is_shared ? "brand" : "slate"}>
                  {template.is_shared ? <Users className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />}
                  {template.is_shared ? "Shared" : "Private"}
                </Badge>
              </div>
              <div className="mt-auto flex gap-2 border-t border-surface-border pt-4">
                <Button
                  size="sm"
                  leftIcon={<CopyPlus className="h-4 w-4" />}
                  onClick={async () => {
                    const project = await useTemplate(template.id);
                    toast.success("Project created from template");
                    router.push(`/projects/${project.id}`);
                  }}
                >
                  Use Template
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={async () => {
                    if (!confirm(`Delete template "${template.name}"?`)) return;
                    await deleteTemplate(template.id);
                    toast.success("Template deleted");
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
