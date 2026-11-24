import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Info,
  Calendar,
  Filter,
  Download,
  Share2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import StatCard from '../components/StatCard';
import { api } from '../services/api';
import { cn } from '../utils/helpers';

const PIE_COLORS = ['#6366F1', '#3B82F6', '#06B6D4', '#8B5CF6', '#10B981'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('7d');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.getAnalyticsOverview();
        if (res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.warn('Analytics fetch warning, fallback to local dataset:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const summary = data || {
    is_demo_preview: true,
    total_successful_commands: 428,
    failed_gestures: 24,
    accidental_activations: 11,
    average_response_time_ms: 230.5,
    overall_accuracy_percentage: 94.7,
    gestures_breakdown: [
      { gesture_name: 'Pinch to Select', sample_count: 184, success_rate: 96.2, avg_latency_ms: 195.4 },
      { gesture_name: 'Swipe Next', sample_count: 122, success_rate: 97.5, avg_latency_ms: 210.0 },
      { gesture_name: 'Swipe Prev', sample_count: 58, success_rate: 93.1, avg_latency_ms: 225.8 },
      { gesture_name: 'Palm Pause', sample_count: 36, success_rate: 91.7, avg_latency_ms: 280.2 },
      { gesture_name: 'Virtual Pointing', sample_count: 240, success_rate: 95.0, avg_latency_ms: 145.0 },
    ],
    daily_trend: [
      { day: 'Mon', accuracy: 92.4, responseTime: 260, commands: 48 },
      { day: 'Tue', accuracy: 93.8, responseTime: 245, commands: 62 },
      { day: 'Wed', accuracy: 95.1, responseTime: 235, commands: 85 },
      { day: 'Thu', accuracy: 94.6, responseTime: 228, commands: 74 },
      { day: 'Fri', accuracy: 96.0, responseTime: 215, commands: 92 },
      { day: 'Sat', accuracy: 96.8, responseTime: 204, commands: 67 },
    ],
  };

  const gestureDistribution = summary.gestures_breakdown.map((g) => ({
    name: g.gesture_name,
    value: g.sample_count,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Prominent Demo Preview Transparency Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3">
        <Info className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            DEMO PREVIEW — Sample Baseline Data
          </p>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            The telemetry statistics below are simulated baseline test benchmarks for previewing the
            EdTech reporting interface. Live telemetry accumulates automatically as students interact
            with classroom lessons.
          </p>
        </div>
      </div>

      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Telemetry Dashboard</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Classroom Interaction Analytics</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Performance analytics, response latency trends, and false-activation suppression reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeFilter(range)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                timeFilter === range
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-glow-indigo/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              )}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Successful Commands"
          value={summary.total_successful_commands}
          subtitle="94.7% total completion"
          icon={CheckCircle2}
          trend="+8.2%"
          trendPositive={true}
          badgeText="Verified triggers"
        />
        <StatCard
          title="Failed Gestures"
          value={summary.failed_gestures}
          subtitle="Unrecognized movements"
          icon={XCircle}
          trend="-15% decrease"
          trendPositive={true}
          badgeText="Improving models"
        />
        <StatCard
          title="Accidental Activations"
          value={summary.accidental_activations}
          subtitle="Filtered resting twitch motions"
          icon={AlertTriangle}
          trend="2.4% rate"
          trendPositive={true}
          badgeText="Strict resting zone"
        />
        <StatCard
          title="Average Latency"
          value={`${summary.average_response_time_ms} ms`}
          subtitle="Recognition to action"
          icon={Clock}
          trend="-24ms faster"
          trendPositive={true}
          badgeText="Near zero perceptible lag"
        />
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Area Chart (8 Cols) */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Accuracy & Response Time Trend</h3>
              <p className="text-xs text-slate-400">Daily recognition stability across recent classroom trials</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Accuracy (%)
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                Response Time (ms)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.daily_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAccuracy)" />
                <Area type="monotone" dataKey="responseTime" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorResponse)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gesture Type Distribution Donut Chart (4 Cols) */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white">Gesture Distribution</h3>
          <p className="text-xs text-slate-400">Frequency breakdown by gesture trigger type</p>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gestureDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {gestureDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2">
            {summary.gestures_breakdown.slice(0, 3).map((g, i) => (
              <div key={g.gesture_name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  {g.gesture_name}
                </span>
                <span className="font-mono text-slate-400">{g.sample_count} uses</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recognition Statistics Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white">Per-Gesture Recognition & Latency Statistics</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Gesture Type</th>
                <th className="py-3 px-4">Total Tested</th>
                <th className="py-3 px-4">Success Rate</th>
                <th className="py-3 px-4">Avg. Response Time</th>
                <th className="py-3 px-4">Accidental Activation</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {summary.gestures_breakdown.map((row) => (
                <tr key={row.gesture_name} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">{row.gesture_name}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{row.sample_count}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-semibold">{row.success_rate}%</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{row.avg_latency_ms} ms</td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">{row.accidental_rate || '2.0'}%</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Optimized
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
