'use client';

import { useState } from 'react';
import { GlobeAltIcon, PaintBrushIcon } from '@heroicons/react/24/outline';

export default function BrandingSettingsPage() {
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [customDomain, setCustomDomain] = useState('');
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Mock save
    setTimeout(() => {
      setIsSaving(false);
      alert('Branding settings saved');
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Custom Branding</h1>
        <p className="mt-2 text-slate-400">Personalize your workspace and video player appearance.</p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 rounded-lg">
            <PaintBrushIcon className="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Visuals</h2>
            <p className="text-sm text-slate-400">Configure colors and logos for your brand.</p>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Primary Color</label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 bg-black border border-slate-800 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-black border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-500 font-mono"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-black/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={removeWatermark}
                  onChange={(e) => setRemoveWatermark(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-black text-pink-500 focus:ring-pink-500 focus:ring-offset-slate-900"
                />
                <div>
                  <span className="block font-medium text-white">Remove OmneaxaFlow Watermark</span>
                  <span className="block text-sm text-slate-400 mt-0.5">Videos will not include the "Powered by OmneaxaFlow" badge. (Requires Pro)</span>
                </div>
              </label>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">Custom Domain <span className="px-2 py-0.5 ml-2 text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-500 rounded">Business</span></h3>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="e.g. videos.yourcompany.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="flex-1 max-w-md bg-black border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-pink-500 placeholder-slate-600"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Map a custom domain to host your shared videos on your own URL.</p>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
