import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench,
  Clock,
  CheckCircle2,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { apiClient } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/StatCard';

const STATUS_COLORS = {
  RECEIVED: '#3b82f6',
  UNDER_DIAGNOSIS: '#8b5cf6',
  WAITING_FOR_APPROVAL: '#f59e0b',
  WAITING_FOR_PARTS: '#ec4899',
  IN_PROGRESS: '#06b6d4',
  QUALITY_CHECK: '#6366f1',
  READY_FOR_DELIVERY: '#10b981',
  DELIVERED: '#059669',
  CANCELLED: '#64748b',
  UNREPAIRABLE: '#ef4444',
};

export const DashboardPage = () => {
  const { user } = useAuth();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/');
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Connecting to PostgreSQL database & loading metrics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl max-w-lg mx-auto text-center space-y-3 mt-10">
        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
        <h3 className="text-base font-semibold text-red-900">Failed to load dashboard data</h3>
        <p className="text-xs text-red-700">{error?.message || 'Check Django REST API connection on port 8000.'}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const statusDist = data?.status_distribution || [];
  const revenueTrend = data?.monthly_revenue_trend || [];
  const technicians = data?.technician_performance || [];
  const recentRepairs = data?.recent_repairs || [];
  const currency = data?.shop_info?.currency_symbol || '$';

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.first_name || 'Staff'}!
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time repair operations for <span className="font-semibold text-slate-700">{user?.business?.name || 'FixFlow'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <a
            href="/repairs/new"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Repair Ticket</span>
          </a>
        </div>
      </div>

      {/* 6 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Repairs"
          value={kpis.total_repairs ?? 0}
          icon={Wrench}
          color="blue"
          subtitle="All-time registered"
        />
        <StatCard
          title="Pending Repairs"
          value={kpis.pending_repairs ?? 0}
          icon={Clock}
          color="amber"
          subtitle="In pipeline"
        />
        <StatCard
          title="Completed"
          value={kpis.completed_repairs ?? 0}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Delivered / Ready"
        />
        <StatCard
          title="Total Customers"
          value={kpis.total_customers ?? 0}
          icon={Users}
          color="purple"
          subtitle="Active client base"
        />
        <StatCard
          title="Monthly Revenue"
          value={`${currency}${(kpis.monthly_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="emerald"
          subtitle="This calendar month"
        />
        <StatCard
          title="Inventory Alerts"
          value={kpis.inventory_alerts ?? 0}
          icon={AlertTriangle}
          color={kpis.inventory_alerts > 0 ? 'rose' : 'blue'}
          subtitle="Low-stock items"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Revenue Trend Area Chart */}
        <div className="lg:col-span-8 p-5 bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Revenue Performance</h3>
              <p className="text-xs text-slate-500">Monthly payments received across all repair tickets</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              PostgreSQL Live
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${currency}${val.toFixed(2)}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Repair Status Distribution Bar Chart */}
        <div className="lg:col-span-4 p-5 bg-white border border-slate-200/90 rounded-xl shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Repair Status Pipeline</h3>
            <p className="text-xs text-slate-500">Distribution across active workflow stages</p>
          </div>

          <div className="flex-1 min-h-[220px]">
            {statusDist.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No active tickets in pipeline
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDist} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} hide />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val) => [val, 'Tickets']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#2563eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Technicians & Recent Tickets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Repair Tickets */}
        <div className="lg:col-span-8 p-5 bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Repair Tickets</h3>
              <p className="text-xs text-slate-500">Active device repairs currently in the workshop</p>
            </div>
            <a href="/repairs" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Ticket #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Device</th>
                  <th className="py-2.5 px-3">Technician</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {recentRepairs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No repairs logged yet. Create your first repair ticket!
                    </td>
                  </tr>
                ) : (
                  recentRepairs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-semibold text-blue-600">{r.ticket_number}</td>
                      <td className="py-2.5 px-3">{r.customer_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.device_info}</td>
                      <td className="py-2.5 px-3 text-slate-500">{r.technician_name}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
                          style={{
                            backgroundColor: `${STATUS_COLORS[r.status] || '#64748b'}18`,
                            color: STATUS_COLORS[r.status] || '#64748b',
                          }}
                        >
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={`/track/${r.tracking_token}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Customer QR Tracking"
                          className="inline-flex items-center text-slate-400 hover:text-blue-600 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Technician Workload */}
        <div className="lg:col-span-4 p-5 bg-white border border-slate-200/90 rounded-xl shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Technician Workload</h3>
            <p className="text-xs text-slate-500">Active vs completed tickets per technician</p>
          </div>

          <div className="space-y-3">
            {technicians.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No technicians assigned</p>
            ) : (
              technicians.map((t) => (
                <div key={t.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>{t.name}</span>
                    <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      {t.active_tickets} Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Completed repairs:</span>
                    <span className="font-semibold text-emerald-600">{t.completed_tickets} done</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
