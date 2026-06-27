"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Film, Sparkles } from "lucide-react";
import api from "@/lib/api";
import type { Project } from "@/types";
import { Button, LinkButton } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";

const schema = z.object({
  title:       z.string().min(1, "Title is required").max(255),
  description: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

const TEMPLATES = [
  { label: "Product Demo",     script: "Welcome to our product overview. Today we'll walk you through the key features..." },
  { label: "Company Update",   script: "Hello team! I'm excited to share our latest company updates with you today..." },
  { label: "Training Module",  script: "Welcome to this training module. By the end of this video, you'll understand..." },
  { label: "Sales Pitch",      script: "Are you struggling with [problem]? Our solution helps you [benefit] in just..." },
];

export default function NewProjectPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      api.post<Project>("/projects", data).then((r) => r.data),
    onSuccess: (project) => {
      toast.success("Project created!");
      router.push(`/projects/${project.id}`);
    },
    onError: () => toast.error("Failed to create project"),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LinkButton href="/projects" variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </LinkButton>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">New Project</h1>
        <p className="text-sm text-slate-400 mt-1">Set up your video project to get started.</p>
      </div>

      {/* Main form */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-600/10 flex items-center justify-center flex-shrink-0">
            <Film className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Project details</h3>
            <p className="text-xs text-slate-500">You can edit these later in the editor.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <Input
            label="Project title *"
            placeholder="e.g. Q4 Product Explainer"
            error={errors.title?.message}
            autoFocus
            {...register("title")}
          />
          <Textarea
            label="Description"
            placeholder="What is this video about? (optional)"
            error={errors.description?.message}
            hint="Helps you stay organised as your project list grows."
            {...register("description")}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={mutation.isPending} fullWidth>
              Create project
            </Button>
            <LinkButton href="/projects" variant="secondary">
              Cancel
            </LinkButton>
          </div>
        </form>
      </Card>

      {/* Templates */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <h3 className="font-semibold text-white text-sm">Start from a template</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setValue("title", t.label)}
              className="text-left px-3 py-2.5 rounded-xl border border-surface-border hover:border-brand-600/40 hover:bg-brand-600/5 transition-all group"
            >
              <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                {t.label}
              </p>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{t.script}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
