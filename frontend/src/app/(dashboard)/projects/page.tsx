"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Film, Trash2, Edit2, Search, MoreVertical, Clock } from "lucide-react";
import api from "@/lib/api";
import type { ProjectListResponse } from "@/types";
import { formatDateRelative } from "@/lib/utils";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";

function SkeletonProjectCard() {
  return (
    <div className="card animate-pulse flex flex-col gap-4">
      <div className="w-full aspect-video rounded-xl skeleton" />
      <div className="space-y-2">
        <div className="skeleton h-4 rounded w-3/4" />
        <div className="skeleton h-3 rounded w-1/2" />
      </div>
      <div className="flex justify-between">
        <div className="skeleton h-5 rounded-full w-16" />
        <div className="skeleton h-3 rounded w-20" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-7 rounded-lg flex-1" />
        <div className="skeleton h-7 rounded-lg w-8" />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const PAGE_SIZE = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["projects", page],
    queryFn: () =>
      api.get<ProjectListResponse>(`/projects?page=${page}&page_size=${PAGE_SIZE}`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete project"),
  });

  const filtered = (data?.items ?? []).filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">{data?.total ?? 0} total projects</p>
        </div>
        <LinkButton href="/projects/new" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          New project
        </LinkButton>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonProjectCard key={i} />)}
        </div>
      ) : !filtered.length ? (
        <Card>
          <EmptyState
            icon={<Film className="w-7 h-7" />}
            title={search ? "No matching projects" : "No projects yet"}
            description={
              search
                ? "Try a different search term."
                : "Create your first project and start generating AI videos."
            }
            action={
              !search ? (
                <LinkButton href="/projects/new" variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Create project
                </LinkButton>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((project) => (
              <Card
                key={project.id}
                className="group flex flex-col gap-4 hover:border-brand-600/30 hover:-translate-y-0.5 transition-all duration-200 cursor-default"
              >
                {/* Thumbnail */}
                <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-surface-elevated to-surface-border flex items-center justify-center relative overflow-hidden">
                  <Film className="w-8 h-8 text-slate-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Link
                    href={`/projects/${project.id}`}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="bg-brand-600/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
                      Open Editor
                    </span>
                  </Link>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/projects/${project.id}`} className="flex-1 min-w-0 group/title">
                      <h3 className="font-medium text-white text-sm line-clamp-1 group-hover/title:text-brand-300 transition-colors">
                        {project.title}
                      </h3>
                    </Link>
                    <button
                      className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0"
                      aria-label="More options"
                      onClick={() => setDeleteId(project.id)}
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {project.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{project.description}</p>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={project.status} />
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateRelative(project.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-surface-border">
                  <LinkButton
                    href={`/projects/${project.id}`}
                    variant="secondary"
                    size="xs"
                    leftIcon={<Edit2 className="w-3 h-3" />}
                    className="flex-1 justify-center"
                  >
                    Edit
                  </LinkButton>
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() => setDeleteId(project.id)}
                    aria-label={`Delete ${project.title}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-slate-400 px-2">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        title="Delete project?"
        message="This permanently deletes the project and all its videos. This cannot be undone."
        confirmLabel="Delete project"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
