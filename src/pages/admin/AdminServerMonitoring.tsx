import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Clock, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Percent, 
  Wifi, 
  ArrowUpRight, 
  ArrowDownRight, 
  Database, 
  Radio, 
  AlertOctagon, 
  X, 
  Trash2, 
  Search, 
  Sliders, 
  ShieldAlert, 
  Globe, 
  Eye, 
  Layers, 
  Check, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { toast } from 'react-hot-toast';

interface ServerAlert {
  id: string;
  type: 'cpu' | 'ram' | 'storage' | 'ssl' | 'server_down' | 'custom';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metric: string;
  currentValue: string | number;
  threshold: string | number;
  timestamp: string;
  isActive: boolean;
}

interface ErrorLogItem {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  ip?: string;
  durationMs?: number;
  userAgent?: string;
}

interface HistoricalDataPoint {
  date: string;
  formattedDate: string;
  visitors: number;
  orders: number;
  sales: number;
  conversionRate: number;
  responseTimeMs: number;
  cpuUsagePercent: number;
  ramUsagePercent: number;
  bandwidthMB: number;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  sales: number;
  views: number;
  revenue: number;
  growth: string;
}

interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
  color: string;
}

interface TelemetryData {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  metrics: {
    cpu: {
      usagePercent: number;
      cores: number;
      model: string;
      status: string;
    };
    ram: {
      totalGB: number;
      usedGB: number;
      freeGB: number;
      usagePercent: number;
      status: string;
    };
    storage: {
      totalGB: number;
      usedGB: number;
      freeGB: number;
      usagePercent: number;
      status: string;
    };
    database: {
      sizeFormatted: string;
      sizeMB: number;
      sizeGB: number;
      tableCount: number;
      recordCount: number;
    };
    network: {
      monthlyBandwidthGB: number;
      monthlyQuotaGB: number;
      bandwidthUsagePercent: number;
      uploadSpeedFormatted: string;
      downloadSpeedFormatted: string;
      uploadSpeedKbps: number;
      downloadSpeedKbps: number;
    };
    uptime: {
      totalSeconds: number;
      formatted: string;
      formattedBn: string;
      startedAt: string;
    };
    performance: {
      activeUsers: number;
      ordersPerMinute: number;
      apiResponseTimeMs: number;
      minLatencyMs: number;
      maxLatencyMs: number;
      p95LatencyMs: number;
      p99LatencyMs: number;
      latencyStatus: string;
    };
    ssl: {
      valid: boolean;
      issuer: string;
      protocol: string;
      daysRemaining: number;
      expiryDate: string;
      isExpiringSoon: boolean;
      status: string;
    };
  };
  alerts: {
    activeCount: number;
    criticalCount: number;
    warningCount: number;
    items: ServerAlert[];
    thresholds: {
      cpu: number;
      ram: number;
      storage: number;
      sslDays: number;
    };
  };
  analytics: {
    liveVisitors: number;
    todayVisitors: number;
    salesToday: number;
    salesTodayFormatted: string;
    ordersToday: number;
    conversionRate: number;
    topProducts: TopProduct[];
    trafficSources: TrafficSource[];
  };
  historical: {
    selectedDays: number;
    data: HistoricalDataPoint[];
  };
  errorLogs: {
    totalCount: number;
    items: ErrorLogItem[];
  };
}

export const AdminServerMonitoring: React.FC = () => {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [historyDays, setHistoryDays] = useState<7 | 30 | 90>(7);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // in seconds
  const [activeChartTab, setActiveChartTab] = useState<'traffic' | 'sales' | 'server' | 'conversion'>('traffic');
  const [errorSearchQuery, setErrorSearchQuery] = useState<string>('');
  const [errorStatusFilter, setErrorStatusFilter] = useState<'all' | '5xx' | '4xx'>('all');
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Fetch telemetry from server
  const fetchTelemetry = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) {
        setRefreshing(true);
      }
      const res = await fetch(`/api/admin/server-monitoring?days=${historyDays}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err: any) {
      console.error('Failed to load server telemetry:', err);
      if (!isBackground) {
        toast.error('সার্ভার মেট্রিক্স লোড করতে ব্যর্থ হয়েছে');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [historyDays]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchTelemetry(true);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchTelemetry]);

  // Dismiss an alert
  const handleDismissAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/admin/server-monitoring/dismiss-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      if (res.ok) {
        toast.success('অ্যালার্ট ডিসমিস করা হয়েছে');
        fetchTelemetry(true);
      }
    } catch {
      toast.error('অ্যালার্ট বাতিল করা যায়নি');
    }
  };

  // Trigger test alert
  const handleTriggerTestAlert = async (type: 'cpu' | 'ram' | 'storage' | 'ssl' | 'server_down') => {
    try {
      setActionInProgress(type);
      const res = await fetch('/api/admin/server-monitoring/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`সিমুলেটেড অ্যালার্ট তৈরি করা হয়েছে: ${result.alert.title}`);
        fetchTelemetry(true);
        setShowSimModal(false);
      }
    } catch {
      toast.error('টেস্ট অ্যালার্ট ট্রিগার করা যায়নি');
    } finally {
      setActionInProgress(null);
    }
  };

  // Clear error logs
  const handleClearErrorLogs = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে সমস্ত এরর লগ ডিলিট করতে চান?')) return;
    try {
      const res = await fetch('/api/admin/server-monitoring/error-logs', {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('সমস্ত এরর লগ মুছে ফেলা হয়েছে');
        fetchTelemetry(true);
      }
    } catch {
      toast.error('লগ মুছতে ব্যর্থ হয়েছে');
    }
  };

  // Filtered error logs
  const filteredErrorLogs = (data?.errorLogs.items || []).filter(item => {
    const matchesSearch = 
      item.path.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
      item.statusCode.toString().includes(errorSearchQuery) ||
      (item.ip || '').includes(errorSearchQuery);

    if (!matchesSearch) return false;

    if (errorStatusFilter === '5xx') return item.statusCode >= 500;
    if (errorStatusFilter === '4xx') return item.statusCode >= 400 && item.statusCode < 500;
    return true;
  });

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center">
        <div className="w-12 h-12 border-4 border-[#6C3BFF]/20 border-t-[#6C3BFF] rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-bold text-gray-800">অ্যাডভান্সড সার্ভার মনিটরিং লোড হচ্ছে...</h3>
        <p className="text-sm text-gray-500 mt-1">CPU, RAM, Storage, SSL ও রিয়েল-টাইম মেট্রিক্স ফেচ করা হচ্ছে</p>
      </div>
    );
  }

  const m = data?.metrics;
  const a = data?.analytics;
  const activeAlerts = data?.alerts.items || [];
  const hasCriticalAlerts = activeAlerts.some(al => al.severity === 'critical');

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header & Quick Action Controls */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#6C3BFF] to-[#8C52FF] flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Server Monitoring Dashboard
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  data?.status === 'critical' 
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : data?.status === 'warning'
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    data?.status === 'critical' ? 'bg-rose-500 animate-ping' : data?.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  {data?.status === 'critical' ? 'CRITICAL ALERT' : data?.status === 'warning' ? 'WARNING' : 'OPERATIONAL'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                রিয়েল-টাইম হার্ডওয়্যার মেট্রিক্স, ব্যান্ডউইথ, SSL স্ট্যাটাস, লাইভ অ্যানালিটিক্স ও অ্যালার্ট সিস্টেম
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto refresh dropdown */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700">
            <Clock className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
            <span className="mr-2 font-medium">অটো রিফ্রেশ:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
            >
              <option value={5}>৫ সেকেন্ড</option>
              <option value={10}>১০ সেকেন্ড</option>
              <option value={30}>৩০ সেকেন্ড</option>
              <option value={0}>বন্ধ</option>
            </select>
          </div>

          {/* Test Alert Simulator Button */}
          <button
            onClick={() => setShowSimModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 text-[#6C3BFF] hover:bg-purple-100 border border-purple-200 transition-colors"
          >
            <ShieldAlert className="w-4 h-4 text-[#6C3BFF]" />
            <span>অ্যালার্ট টেস্ট করুন</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchTelemetry(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'আপডেট হচ্ছে...' : 'রিফ্রেশ'}</span>
          </button>
        </div>
      </div>

      {/* Active Alerts Banner Section */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              সক্রিয় অ্যালার্টসমূহ ({activeAlerts.length})
            </h2>
            <span className="text-xs text-gray-500">থ্রেশহোল্ড অতিক্রম করেছে এমন সমস্যা</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeAlerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                    isCritical 
                      ? 'bg-rose-50/90 border-rose-200 text-rose-950' 
                      : 'bg-amber-50/90 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isCritical ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      <AlertOctagon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black tracking-tight">{alert.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isCritical ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-gray-700 leading-relaxed">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-gray-600">
                        <span>বর্তমান মান: <strong className="text-black">{alert.currentValue}</strong></span>
                        <span>•</span>
                        <span>থ্রেশহোল্ড: <strong>{alert.threshold}</strong></span>
                        <span>•</span>
                        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    title="অ্যালার্ট ডিসমিস করুন"
                    className="p-1.5 hover:bg-black/5 rounded-lg text-gray-500 hover:text-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary Server Hardware & Infrastructure Cards (CPU, RAM, Disk, DB, Bandwidth, Uptime) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. CPU Usage */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">CPU Usage</span>
            <div className={`p-2 rounded-xl ${
              (m?.cpu.usagePercent || 0) > 80 ? 'bg-rose-100 text-rose-600' : 'bg-purple-50 text-[#6C3BFF]'
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {m?.cpu.usagePercent || 0}%
              </span>
              <span className="text-xs font-bold text-gray-400">({m?.cpu.cores} Cores)</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full transition-all duration-500 ${
                  (m?.cpu.usagePercent || 0) > 80 ? 'bg-rose-500' : (m?.cpu.usagePercent || 0) > 60 ? 'bg-amber-500' : 'bg-[#6C3BFF]'
                }`}
                style={{ width: `${Math.min(100, m?.cpu.usagePercent || 0)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-gray-500 pt-2 border-t border-gray-100">
            <span>অ্যালার্ট সীমা: &gt; ৮০%</span>
            <span className={m?.cpu.status === 'Critical' ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
              {m?.cpu.status}
            </span>
          </div>
        </div>

        {/* 2. RAM Usage */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">RAM Usage</span>
            <div className={`p-2 rounded-xl ${
              (m?.ram.usagePercent || 0) > 80 ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-blue-600'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {m?.ram.usagePercent || 0}%
              </span>
              <span className="text-xs font-bold text-gray-400">
                {m?.ram.usedGB} / {m?.ram.totalGB} GB
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full transition-all duration-500 ${
                  (m?.ram.usagePercent || 0) > 80 ? 'bg-rose-500' : (m?.ram.usagePercent || 0) > 65 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, m?.ram.usagePercent || 0)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-gray-500 pt-2 border-t border-gray-100">
            <span>ফ্রি: {m?.ram.freeGB} GB</span>
            <span className={m?.ram.status === 'Critical' ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
              {m?.ram.status}
            </span>
          </div>
        </div>

        {/* 3. Storage / Disk Usage */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Disk Storage</span>
            <div className={`p-2 rounded-xl ${
              (m?.storage.usagePercent || 0) > 90 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {m?.storage.usedGB} <span className="text-base font-bold">GB</span>
              </span>
              <span className="text-xs font-bold text-gray-400">/ {m?.storage.totalGB} GB</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full transition-all duration-500 ${
                  (m?.storage.usagePercent || 0) > 90 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, m?.storage.usagePercent || 0)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-gray-500 pt-2 border-t border-gray-100">
            <span>ফ্রি: {m?.storage.freeGB} GB</span>
            <span className="font-bold text-gray-700">{m?.storage.usagePercent}% Used</span>
          </div>
        </div>

        {/* 4. Database Size */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Database Size</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {m?.database.sizeFormatted}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              {m?.database.tableCount} Tables • {m?.database.recordCount.toLocaleString()} Records
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-gray-500 pt-2 border-t border-gray-100">
            <span>স্ট্যাটাস: অ্যাক্টিভ</span>
            <span className="text-emerald-600 font-bold">Optimized</span>
          </div>
        </div>

        {/* 5. Monthly Bandwidth */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Bandwidth</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {m?.network.monthlyBandwidthGB} <span className="text-base font-bold">GB</span>
              </span>
              <span className="text-xs font-bold text-gray-400">/ {m?.network.monthlyQuotaGB} GB</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, m?.network.bandwidthUsagePercent || 0)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-gray-500 pt-2 border-t border-gray-100">
            <span>কোটা ব্যবহার: {m?.network.bandwidthUsagePercent}%</span>
            <span className="text-indigo-600 font-bold">Normal</span>
          </div>
        </div>

        {/* 6. Server Uptime */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Server Uptime</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">
                {m?.uptime.formatted}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              ৯৯.৯৮% আপটাইম অনুপাত
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-gray-500 pt-2 border-t border-gray-100">
            <span>অবিরাম চলমান</span>
            <span className="text-emerald-600 font-bold">100% Up</span>
          </div>
        </div>
      </div>

      {/* Network Speed, Performance & SSL Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Network Speed (Upload / Download) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Wifi className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Network Speed</h3>
            </div>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">Live Stream</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>Download Speed</span>
              </div>
              <p className="text-lg font-black text-gray-900">{m?.network.downloadSpeedFormatted}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
                <span>Upload Speed</span>
              </div>
              <p className="text-lg font-black text-gray-900">{m?.network.uploadSpeedFormatted}</p>
            </div>
          </div>
        </div>

        {/* Real-time Performance (Active Users, Orders Per Min, API Latency) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-[#6C3BFF]">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">App Performance</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>রিয়েল-টাইম</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p className="text-[11px] text-gray-500 font-medium">Active Users</p>
              <p className="text-base font-black text-gray-900 mt-1">{m?.performance.activeUsers}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p className="text-[11px] text-gray-500 font-medium">Orders / Min</p>
              <p className="text-base font-black text-gray-900 mt-1">{m?.performance.ordersPerMinute} OPM</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p className="text-[11px] text-gray-500 font-medium">API Response</p>
              <p className="text-base font-black text-emerald-600 mt-1">{m?.performance.apiResponseTimeMs} ms</p>
            </div>
          </div>
        </div>

        {/* SSL Security & Certificate Status */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">SSL Certificate Security</h3>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              m?.ssl.isExpiringSoon ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {m?.ssl.status}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs text-gray-500">মেয়াদ বাকি রয়েছে</p>
              <p className="text-base font-black text-gray-900 mt-0.5">{m?.ssl.daysRemaining} দিন</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400">প্রোটোকল</p>
              <p className="text-xs font-bold text-gray-700">{m?.ssl.protocol}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Summary Cards (Live Visitors, Today's Visitors, Sales Today, Orders Today, Conversion Rate) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#6C3BFF]" />
              স্টোর অ্যানালিটিক্স ও সেলস মেট্রিক্স (Today)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">আজকের লাইভ অডিয়েন্স, সেলস, অর্ডার ও কনভার্সন রেট</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-[#6C3BFF] rounded-full text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>লাইভ ডেটা স্ট্রিম</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Live Visitors */}
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-purple-700 font-bold mb-1">
              <span>Live Visitors</span>
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{a?.liveVisitors}</p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">বর্তমান সক্রিয় ব্রাউজিং</p>
          </div>

          {/* 2. Today's Visitors */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
            <div className="flex items-center justify-between text-xs text-blue-700 font-bold mb-1">
              <span>Today's Visitors</span>
              <Users className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{a?.todayVisitors.toLocaleString()}</p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">আজকের মোট ভিজিটর</p>
          </div>

          {/* 3. Sales Today */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-bold mb-1">
              <span>Sales Today</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700">{a?.salesTodayFormatted}</p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">আজকের মোট বিক্রয়</p>
          </div>

          {/* 4. Orders Today */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
            <div className="flex items-center justify-between text-xs text-amber-700 font-bold mb-1">
              <span>Orders Today</span>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{a?.ordersToday}</p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">আজকের অর্ডার সংখ্যা</p>
          </div>

          {/* 5. Conversion Rate */}
          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs text-rose-700 font-bold mb-1">
              <span>Conversion Rate</span>
              <Percent className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{a?.conversionRate}%</p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">অর্ডার / ভিজিটর অনুপাত</p>
          </div>
        </div>

        {/* Top Products & Traffic Sources Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
          {/* Top Products (7 cols) */}
          <div className="lg:col-span-7 bg-gray-50/80 rounded-xl p-4 border border-gray-100">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>শীর্ষ বিক্রিত প্রোডাক্টস (Top Products)</span>
              <span className="text-[11px] text-gray-400 font-normal">সেলস ও ভিউ অনুযায়ী</span>
            </h3>
            <div className="space-y-2.5">
              {(a?.topProducts || []).map((product, idx) => (
                <div key={product.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200/60 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-900 truncate">{product.name}</p>
                      <p className="text-[10px] text-gray-400">{product.category} • {product.views} Views</p>
                    </div>
                  </div>
                  <div className="text-right pl-3 shrink-0">
                    <p className="text-xs font-black text-gray-900">৳{product.revenue.toLocaleString()}</p>
                    <span className="text-[10px] font-bold text-emerald-600">{product.sales} Orders ({product.growth})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic Sources (5 cols) */}
          <div className="lg:col-span-5 bg-gray-50/80 rounded-xl p-4 border border-gray-100 flex flex-col justify-between">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">
              ট্রাফিক সোর্স (Traffic Sources)
            </h3>
            <div className="space-y-3 my-auto">
              {(a?.trafficSources || []).map((source) => (
                <div key={source.source}>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                      {source.source}
                    </span>
                    <span>{source.percentage}% ({source.visitors.toLocaleString()})</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${source.percentage}%`, backgroundColor: source.color }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 text-right mt-3">Google Analytics 4 & Internal Engine</p>
          </div>
        </div>
      </div>

      {/* Historical Reports & Interactive Graphs (7 Days, 30 Days, 90 Days) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#6C3BFF]" />
              Historical Reports & Performance Graphs
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              সার্ভারের ঐতিহাসিক ডেটা, ট্রাফিক, রেভেনিউ ও সিস্টেম হেলথ ট্রেন্ড
            </p>
          </div>

          {/* Period Selector: 7 Days, 30 Days, 90 Days */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setHistoryDays(7)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                historyDays === 7 ? 'bg-white text-black shadow-xs' : 'text-gray-600 hover:text-black'
              }`}
            >
              ৭ দিন (7 Days)
            </button>
            <button
              onClick={() => setHistoryDays(30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                historyDays === 30 ? 'bg-white text-black shadow-xs' : 'text-gray-600 hover:text-black'
              }`}
            >
              ৩০ দিন (30 Days)
            </button>
            <button
              onClick={() => setHistoryDays(90)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                historyDays === 90 ? 'bg-white text-black shadow-xs' : 'text-gray-600 hover:text-black'
              }`}
            >
              ৯০ দিন (90 Days)
            </button>
          </div>
        </div>

        {/* Chart View Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveChartTab('traffic')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeChartTab === 'traffic'
                ? 'bg-[#6C3BFF] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>ভিজিটর ও অর্ডার (Visitors vs Orders)</span>
          </button>
          <button
            onClick={() => setActiveChartTab('sales')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeChartTab === 'sales'
                ? 'bg-[#6C3BFF] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>বিক্রয় আয় (Revenue ৳)</span>
          </button>
          <button
            onClick={() => setActiveChartTab('server')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeChartTab === 'server'
                ? 'bg-[#6C3BFF] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>সার্ভার CPU, RAM ও রেসপন্স টাইম</span>
          </button>
          <button
            onClick={() => setActiveChartTab('conversion')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeChartTab === 'conversion'
                ? 'bg-[#6C3BFF] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>কনভার্সন রেট (%)</span>
          </button>
        </div>

        {/* Dynamic Chart Container */}
        <div className="h-[320px] sm:h-[380px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartTab === 'traffic' ? (
              <AreaChart data={data?.historical.data || []}>
                <defs>
                  <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C3BFF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6C3BFF" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#10B981' }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111827', borderRadius: '10px', color: '#fff', border: 'none' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Area yAxisId="left" type="monotone" dataKey="visitors" name="Visitors" stroke="#6C3BFF" strokeWidth={2.5} fillOpacity={1} fill="url(#visitorGrad)" />
                <Area yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#orderGrad)" />
              </AreaChart>
            ) : activeChartTab === 'sales' ? (
              <BarChart data={data?.historical.data || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111827', borderRadius: '10px', color: '#fff', border: 'none' }}
                  formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'Daily Sales']}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="sales" name="বিক্রয় আয় (Sales ৳)" fill="#6C3BFF" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : activeChartTab === 'server' ? (
              <LineChart data={data?.historical.data || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis yAxisId="left" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis yAxisId="right" orientation="right" unit="ms" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111827', borderRadius: '10px', color: '#fff', border: 'none' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line yAxisId="left" type="monotone" dataKey="cpuUsagePercent" name="CPU Usage %" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="left" type="monotone" dataKey="ramUsagePercent" name="RAM Usage %" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="responseTimeMs" name="Response Time (ms)" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : (
              <AreaChart data={data?.historical.data || []}>
                <defs>
                  <linearGradient id="crGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EC4899" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111827', borderRadius: '10px', color: '#fff', border: 'none' }}
                  formatter={(val: any) => [`${val}%`, 'Conversion Rate']}
                />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="conversionRate" name="Conversion Rate (%)" stroke="#EC4899" strokeWidth={2.5} fillOpacity={1} fill="url(#crGrad)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error Logs Management Section */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                Server Error Logs & Exceptions
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700">
                {filteredErrorLogs.length} Logs
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              API এন্ডপয়েন্ট বা পেজ লোডের সময় রেকর্ড হওয়া ৪xx ও ৫xx এরর সমূহ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearErrorLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>লগ ক্লিয়ার করুন</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="রাউট, স্ট্যাটাস কোড বা এরর মেসেজ দিয়ে সার্চ করুন..."
              value={errorSearchQuery}
              onChange={(e) => setErrorSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#6C3BFF]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setErrorStatusFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold ${
                errorStatusFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              সব লগ
            </button>
            <button
              onClick={() => setErrorStatusFilter('5xx')}
              className={`px-3 py-2 rounded-xl text-xs font-bold ${
                errorStatusFilter === '5xx' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              5xx Server Errors
            </button>
            <button
              onClick={() => setErrorStatusFilter('4xx')}
              className={`px-3 py-2 rounded-xl text-xs font-bold ${
                errorStatusFilter === '4xx' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              4xx Client Errors
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">সময় (Time)</th>
                <th className="p-3">Status</th>
                <th className="p-3">Method & Path</th>
                <th className="p-3">Message</th>
                <th className="p-3">Latency</th>
                <th className="p-3">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredErrorLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    কোনো এরর লগ পাওয়া যায়নি। সিস্টেম মসৃণভাবে চলছে।
                  </td>
                </tr>
              ) : (
                filteredErrorLogs.map((log) => {
                  const is5xx = log.statusCode >= 500;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 whitespace-nowrap text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                          is5xx ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-gray-800">
                        <span className="text-gray-400 mr-1.5">{log.method}</span>
                        {log.path}
                      </td>
                      <td className="p-3 text-gray-600 max-w-xs truncate">
                        {log.message}
                      </td>
                      <td className="p-3 text-gray-500 whitespace-nowrap font-medium">
                        {log.durationMs ? `${log.durationMs}ms` : '-'}
                      </td>
                      <td className="p-3 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                        {log.ip || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-[#6C3BFF]">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Alert System Simulator</h3>
                  <p className="text-xs text-gray-500">টেস্টিং এর জন্য তাৎক্ষণিক অ্যালার্ট তৈরি করুন</p>
                </div>
              </div>
              <button
                onClick={() => setShowSimModal(false)}
                className="p-1 text-gray-400 hover:text-black rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              সিস্টেমের প্রয়োজনীয় ৫টি অ্যালার্ট কন্ডিশন যেকোনো সময় টেস্ট করতে নিচের বাটনগুলোতে ক্লিক করুন:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleTriggerTestAlert('cpu')}
                disabled={actionInProgress !== null}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 text-rose-900 text-xs font-bold transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-rose-600" />
                  <span>CPU Usage &gt; 80% Alert</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>

              <button
                onClick={() => handleTriggerTestAlert('ram')}
                disabled={actionInProgress !== null}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 text-rose-900 text-xs font-bold transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-rose-600" />
                  <span>RAM Usage &gt; 80% Alert</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>

              <button
                onClick={() => handleTriggerTestAlert('storage')}
                disabled={actionInProgress !== null}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 text-rose-900 text-xs font-bold transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-rose-600" />
                  <span>Storage / Disk &gt; 90% Alert</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>

              <button
                onClick={() => handleTriggerTestAlert('ssl')}
                disabled={actionInProgress !== null}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 text-amber-900 text-xs font-bold transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>SSL Expiry Warning (&lt; 15 days)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={() => handleTriggerTestAlert('server_down')}
                disabled={actionInProgress !== null}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-300 bg-rose-100/60 hover:bg-rose-100 text-rose-950 text-xs font-bold transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <AlertOctagon className="w-4 h-4 text-rose-700" />
                  <span>Server Down / Outage Alert</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-500" />
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowSimModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
