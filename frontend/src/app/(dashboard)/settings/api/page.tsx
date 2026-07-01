'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, KeyIcon, GlobeAltIcon, TrashIcon, ArrowPathIcon, CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { 
  listApiKeys, createApiKey, revokeApiKey, 
  listWebhooks, createWebhook, deleteWebhook, rotateWebhookSecret 
} from '@/lib/api';
import type { ApiKey, Webhook } from '@/types';

export default function ApiSettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['video.completed', 'video.failed']);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        listApiKeys(),
        listWebhooks(),
      ]);
      setApiKeys(keysRes);
      setWebhooks(webhooksRes);
    } catch (error) {
      console.error('Failed to fetch API settings', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    
    setIsCreatingKey(true);
    try {
      const res = await createApiKey(newKeyName);
      setNewlyCreatedKey(res.full_key);
      setNewKeyName('');
      await fetchData();
    } catch (error) {
      console.error('Failed to create key', error);
      alert('Failed to create API key');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this key?')) return;
    try {
      await revokeApiKey(id);
      await fetchData();
    } catch (error) {
      console.error('Failed to revoke key', error);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl.trim() || newWebhookEvents.length === 0) return;

    setIsCreatingWebhook(true);
    try {
      const res = await createWebhook(newWebhookUrl, newWebhookEvents);
      setNewlyCreatedSecret(res.secret);
      setNewWebhookUrl('');
      await fetchData();
    } catch (error) {
      console.error('Failed to create webhook', error);
      alert('Failed to create webhook. Make sure the URL is valid.');
    } finally {
      setIsCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await deleteWebhook(id);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete webhook', error);
    }
  };

  const handleRotateSecret = async (id: number) => {
    if (!confirm('Are you sure? The old secret will be immediately invalidated.')) return;
    try {
      const res = await rotateWebhookSecret(id);
      setNewlyCreatedSecret(res.secret);
      await fetchData();
    } catch (error) {
      console.error('Failed to rotate secret', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SecretModal = ({ 
    title, 
    value, 
    description, 
    onClose 
  }: { 
    title: string, value: string, description: string, onClose: () => void 
  }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6 text-sm">{description}</p>
        
        <div className="flex items-center gap-2 mb-6">
          <code className="flex-1 bg-black/50 border border-slate-800 rounded-lg p-3 text-emerald-400 font-mono break-all">
            {value}
          </code>
          <button
            onClick={() => copyToClipboard(value)}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors shrink-0"
          >
            {copied ? <CheckIcon className="w-5 h-5 text-emerald-500" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          I have saved this securely
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Developer API</h1>
        <p className="mt-2 text-slate-400">Manage your API keys and webhook integrations.</p>
      </div>

      {newlyCreatedKey && (
        <SecretModal 
          title="New API Key Generated"
          value={newlyCreatedKey}
          description="Please copy this API key now. For your security, it will never be shown again."
          onClose={() => setNewlyCreatedKey(null)}
        />
      )}

      {newlyCreatedSecret && (
        <SecretModal 
          title="Webhook Secret"
          value={newlyCreatedSecret}
          description="Use this secret to verify the HMAC-SHA256 signatures of incoming webhook payloads. This secret will not be shown again."
          onClose={() => setNewlyCreatedSecret(null)}
        />
      )}

      {/* API Keys Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <KeyIcon className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">API Keys</h2>
              <p className="text-sm text-slate-400">Authenticate your requests to the RenderFlow API.</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleCreateKey} className="flex gap-3 mb-8">
            <input
              type="text"
              placeholder="e.g. Production CI"
              className="flex-1 bg-black border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-all"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={isCreatingKey || !newKeyName.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              Generate Key
            </button>
          </form>

          {isLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="h-12 bg-slate-800 rounded w-full"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No active API keys found.</div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 bg-black/40 border border-slate-800 rounded-xl group hover:border-slate-700 transition-colors">
                  <div>
                    <h4 className="font-medium text-white">{key.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                      <span>{key.key_prefix}...</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                      <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                      <span>Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeKey(key.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    title="Revoke Key"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Webhooks Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <GlobeAltIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Webhooks</h2>
              <p className="text-sm text-slate-400">Receive real-time HTTP POST requests when events occur.</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleCreateWebhook} className="mb-8 p-5 bg-black/40 border border-slate-800 rounded-xl space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Payload URL</label>
              <input
                type="url"
                placeholder="https://your-domain.com/webhooks"
                className="w-full bg-black border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 transition-all"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Events</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newWebhookEvents.includes('video.completed')}
                    onChange={(e) => {
                      if (e.target.checked) setNewWebhookEvents(prev => [...prev, 'video.completed']);
                      else setNewWebhookEvents(prev => prev.filter(x => x !== 'video.completed'));
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-black text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-slate-300">video.completed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newWebhookEvents.includes('video.failed')}
                    onChange={(e) => {
                      if (e.target.checked) setNewWebhookEvents(prev => [...prev, 'video.failed']);
                      else setNewWebhookEvents(prev => prev.filter(x => x !== 'video.failed'));
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-black text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-slate-300">video.failed</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isCreatingWebhook || !newWebhookUrl.trim() || newWebhookEvents.length === 0}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 font-medium"
              >
                <PlusIcon className="w-4 h-4" />
                Add Webhook
              </button>
            </div>
          </form>

          {isLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="h-12 bg-slate-800 rounded w-full"></div>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No webhooks configured.</div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-4 bg-black/40 border border-slate-800 rounded-xl group hover:border-slate-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white break-all">{webhook.url}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        {webhook.event_types.map(evt => (
                          <span key={evt} className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-slate-800 text-slate-300">
                            {evt}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleRotateSecret(webhook.id)}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Rotate Secret"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Webhook"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
