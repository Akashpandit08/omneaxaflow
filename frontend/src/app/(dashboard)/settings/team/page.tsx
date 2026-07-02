'use client';

import { useState } from 'react';
import { UserGroupIcon, UserPlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/store/workspaceStore';
import api from '@/lib/api';

export default function TeamSettingsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [isInviting, setIsInviting] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const res = await api.get(`/workspaces/${currentWorkspace.id}/members`);
      return res.data;
    },
    enabled: !!currentWorkspace,
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentWorkspace) return;
    
    setIsInviting(true);
    try {
      await api.post(`/workspaces/${currentWorkspace.id}/invitations?email=${encodeURIComponent(inviteEmail)}&role=${encodeURIComponent(inviteRole)}`);
      alert(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['workspace-members', currentWorkspace.id] });
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!currentWorkspace) return;
    if (confirm('Are you sure you want to remove this member?')) {
      try {
        await api.delete(`/workspaces/${currentWorkspace.id}/members/${id}`);
        queryClient.invalidateQueries({ queryKey: ['workspace-members', currentWorkspace.id] });
        alert('Member removed successfully');
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Failed to remove member');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Team Members</h1>
        <p className="mt-2 text-slate-400">Manage who has access to this workspace.</p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <UserPlusIcon className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Invite Member</h2>
            <p className="text-sm text-slate-400">Send an invitation to join your workspace.</p>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 bg-black border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="bg-black border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={isInviting}
              className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium whitespace-nowrap disabled:opacity-50"
            >
              {isInviting ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg">
            <UserGroupIcon className="w-6 h-6 text-slate-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Current Members</h2>
            <p className="text-sm text-slate-400">People with access to this workspace.</p>
          </div>
        </div>

        <div className="divide-y divide-slate-800/50">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="p-4 text-center text-slate-400">No members found.</div>
          ) : (
            members.map((member: any) => {
              const email = member.user?.email || member.email || 'Unknown User';
              const initial = email.charAt(0).toUpperCase();
              return (
                <div key={member.id} className="p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {initial}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{member.user?.full_name || 'Member'}</h4>
                      <p className="text-sm text-slate-400">{email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full uppercase tracking-wider font-semibold">
                      {member.role}
                    </span>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove Member"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
