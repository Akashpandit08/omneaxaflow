'use client';

import { useState, useEffect } from 'react';
import { ChartBarIcon, VideoCameraIcon, ArrowDownTrayIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const MOCK_DATA = {
  projects_created: 14,
  renders_started: 42,
  renders_completed: 40,
  renders_failed: 2,
  downloads: 35,
  api_requests: 12450,
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-8 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Advanced Analytics</h1>
        <p className="mt-2 text-slate-400">Monitor your workspace usage, rendering performance, and API volume.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-900 rounded-2xl border border-slate-800"></div>
            ))}
          </div>
          <div className="h-96 bg-slate-900 rounded-2xl border border-slate-800"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Projects" 
              value={MOCK_DATA.projects_created.toString()} 
              icon={<VideoCameraIcon className="w-5 h-5 text-indigo-400" />} 
              trend="+12% from last month"
            />
            <StatCard 
              title="Completed Renders" 
              value={MOCK_DATA.renders_completed.toString()} 
              icon={<ChartBarIcon className="w-5 h-5 text-emerald-400" />} 
              trend="+5% from last month"
            />
            <StatCard 
              title="Video Downloads" 
              value={MOCK_DATA.downloads.toString()} 
              icon={<ArrowDownTrayIcon className="w-5 h-5 text-blue-400" />} 
              trend="+18% from last month"
            />
            <StatCard 
              title="API Requests" 
              value={MOCK_DATA.api_requests.toLocaleString()} 
              icon={<CurrencyDollarIcon className="w-5 h-5 text-amber-400" />} 
              trend="14.2k quota remaining"
            />
          </div>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Usage Over Time</h2>
            <div className="h-72 w-full flex items-end justify-between gap-2 border-b border-l border-slate-800 pt-8 pb-2 px-2">
              {/* Mock Bar Chart */}
              {[30, 45, 25, 60, 80, 55, 90, 40, 75, 100, 65, 85].map((height, i) => (
                <div key={i} className="w-full bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 rounded-t-sm transition-colors relative group" style={{ height: `${height}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {height * 12}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono px-2">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className="p-2 bg-black/50 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-slate-500">{trend}</div>
    </div>
  );
}
