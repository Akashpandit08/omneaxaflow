'use client';

import { useState } from 'react';
import { BuildingOfficeIcon, UserGroupIcon, Cog6ToothIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '@/store/workspaceStore';

export default function WorkspaceSettingsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Mock save
    setTimeout(() => {
      setIsSaving(false);
      alert('Workspace settings saved');
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Workspace Settings</h1>
        <p className="mt-2 text-slate-400">Manage your workspace details and preferences.</p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <BuildingOfficeIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">General Information</h2>
            <p className="text-sm text-slate-400">Basic details about this workspace.</p>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Workspace Name</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full max-w-md bg-black border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="bg-slate-900 border border-red-900/30 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-red-900/30">
          <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>
          <p className="text-sm text-slate-400 mt-1">Irreversible and destructive actions.</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Delete Workspace</h3>
              <p className="text-sm text-slate-400 mt-1">Permanently remove this workspace and all its data.</p>
            </div>
            <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors font-medium border border-red-500/20">
              Delete Workspace
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
