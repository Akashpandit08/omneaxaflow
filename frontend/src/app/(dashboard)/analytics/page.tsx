'use client';

import { useQuery } from '@tanstack/react-query';
import { ChartBarIcon, VideoCameraIcon, ArrowDownTrayIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';

export default function AnalyticsPage() {
  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await api.get('/analytics/overview');
      return res.data.metrics;
    }
  });

  const { data: daily = [], isLoading: isLoadingDaily } = useQuery({
    queryKey: ['analytics-daily'],
    queryFn: async () => {
      const res = await api.get('/analytics/daily');
      return res.data;
    }
  });

  const isLoading = isLoadingOverview || isLoadingDaily;

  // Calculate chart metrics
  const maxRenders = Math.max(...daily.map((d: any) => d.renders_started || 0), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-8 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Advanced Analytics</h1>
        <p className="mt-2 text-slate-400">Monitor your workspace usage, rendering performance, and API volume.</p>
      </div>

      {isLoading ? (
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
              value={overview?.projects_created?.toString() || '0'} 
              icon={<VideoCameraIcon className="w-5 h-5 text-indigo-400" />} 
              trend="All time"
            />
            <StatCard 
              title="Completed Renders" 
              value={overview?.renders_completed?.toString() || '0'} 
              icon={<ChartBarIcon className="w-5 h-5 text-emerald-400" />} 
              trend="All time"
            />
            <StatCard 
              title="Video Downloads" 
              value={overview?.downloads?.toString() || '0'} 
              icon={<ArrowDownTrayIcon className="w-5 h-5 text-blue-400" />} 
              trend="All time"
            />
            <StatCard 
              title="API Requests" 
              value={overview?.api_requests?.toLocaleString() || '0'} 
              icon={<CurrencyDollarIcon className="w-5 h-5 text-amber-400" />} 
              trend="Current billing cycle"
            />
          </div>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Daily Renders Started (Last 30 Days)</h2>
            <div className="h-72 w-full flex items-end justify-between gap-1 sm:gap-2 border-b border-l border-slate-800 pt-8 pb-2 px-2">
              {daily.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500">No data available</div>
              ) : (
                daily.map((d: any, i: number) => {
                  const val = d.renders_started || 0;
                  const height = Math.max((val / maxRenders) * 100, 2); // min height 2%
                  return (
                    <div key={i} className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 rounded-t-sm transition-colors relative group" style={{ height: `${height}%` }}>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                        {val} renders
                        <br/>
                        <span className="text-slate-400 text-[10px]">{d.date}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {daily.length > 0 && (
              <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono px-2">
                <span>{daily[0]?.date}</span>
                <span>{daily[daily.length - 1]?.date}</span>
              </div>
            )}
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
