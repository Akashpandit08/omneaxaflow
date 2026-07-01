"use client";

import React, { useEffect } from "react";
import { useTranslationStore } from "@/store/translationStore";
import { TranslationModal } from "@/components/translation/TranslationModal";

export default function TranslationsPage() {
  const { translations, setTranslations } = useTranslationStore();

  useEffect(() => {
    // We would fetch translations for the workspace here
    // However, the backend endpoint is grouped by video_id
    // For this dashboard view, we might need a general endpoint /api/v1/translations to list all in workspace
    // Let's assume we can fetch it, or just show a dummy list for now.
    // For real implementation, backend needs a general GET /api/v1/translations
  }, [setTranslations]);

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Translations</h1>
        <p className="text-muted-foreground mt-2">
          Manage and view all video translations across your workspace.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Video ID</th>
              <th className="p-4 font-medium">Source</th>
              <th className="p-4 font-medium">Target</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {translations.map(t => (
              <tr key={t.id}>
                <td className="p-4 font-medium">{t.video_id}</td>
                <td className="p-4 uppercase">{t.source_language}</td>
                <td className="p-4 uppercase">{t.target_language}</td>
                <td className="p-4 capitalize">{t.status}</td>
                <td className="p-4 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {translations.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No translations yet. Go to a video to start a translation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
