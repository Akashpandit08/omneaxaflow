"use client";

import React from "react";
import { ServerIcon } from "@heroicons/react/24/outline";

export default function AiProvidersSettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Providers</h1>
        <p className="mt-2 text-slate-400">Manage your AI Provider configurations for voice cloning and TTS.</p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <ServerIcon className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Provider Configuration</h2>
            <p className="text-sm text-slate-400">Configuration is managed securely via environment variables.</p>
          </div>
        </div>

        <div className="p-6 space-y-6 text-slate-300">
          <div className="p-4 bg-black/40 border border-slate-800 rounded-xl">
            <h3 className="font-semibold text-white mb-2">ElevenLabs</h3>
            <p className="text-sm text-slate-400">
              Configured via <code className="text-emerald-400">ELEVENLABS_API_KEY</code> and{" "}
              <code className="text-emerald-400">ELEVENLABS_MODEL_ID</code> in your <code className="text-emerald-400">.env</code> file.
            </p>
          </div>

          <div className="p-4 bg-black/40 border border-slate-800 rounded-xl">
            <h3 className="font-semibold text-white mb-2">OpenAI</h3>
            <p className="text-sm text-slate-400">
              Configured via <code className="text-emerald-400">OPENAI_API_KEY</code> in your <code className="text-emerald-400">.env</code> file.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
