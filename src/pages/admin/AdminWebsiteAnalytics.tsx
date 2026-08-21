import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, Activity, ShoppingBag, DollarSign, TrendingUp, TrendingDown, 
  Calendar, RefreshCw, Eye, ShoppingCart, UserCheck, ShieldCheck, 
  CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Layers, 
  Clock, Globe, Monitor, Smartphone, ChevronRight, BarChart2, Filter,
  ArrowRight, Search, Download, HelpCircle
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { formatPrice } from '../../lib/utils';

type PeriodPreset = 
  | 'today' 
  | 'yesterday' 
  | 'previous_day' 
  | 'last7days' 
  | 'thisweek' 
  | 'lastweek' 
  | 'thismonth' 
  | 'lastmonth' 
  | 'custom'
  | 'single';

export default function AdminWebsiteAnalytics() {
  const [period, setPeriod] = useState<PeriodPreset>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [singleDate, setSingleDate] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'traffic' | 'sales' | 'conversion'>('all');
  const [lastFetchTime, setLastFetchTime] = useState<string>('');

  // Fetch Dashboard Analytics Data from real backend engine
  const fetchAnalytics = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (period === 'single' && singleDate) {
        params.append('singleDate', singleDate);
      } else if (period === 'custom' && startDate && endDate) {
        params.append('period', 'custom');
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        params.append('period', period);
      }

      const res = await fetch(`/api/analytics/dashboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Analytics server responded with status: ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to retrieve analytics payload');
      }

      setAnalyticsData(data);
      setLastFetchTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.error("[Admin Website Analytics] Fetch error:", err);
      setError(err?.message || "Data temporarily unavailable from database");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, startDate, endDate, singleDate]);

  // Initial fetch and auto-refresh live telemetry every 30s
  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const handlePeriodChange = (newPeriod: PeriodPreset) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
    if (newPeriod !== 'single') {
      setSingleDate('');
    }
  };

  const handleCustomApply = () => {
    if (startDate && endDate) {
      setPeriod('custom');
      fetchAnalytics();
    }
  };

  const handleSingleDateApply = () => {
    if (singleDate) {
      setPeriod('single');
      fetchAnalytics();
    }
  };

  // Safe fallback helpers
  const rev = analyticsData?.marketplaceRevenue;
  const orders = analyticsData?.orderDistribution;
  const acq = analyticsData?.acquisitionVelocity;
  const insights = analyticsData?.enterpriseInsights;
  const web = analyticsData?.websiteAnalytics;
  const live = analyticsData?.liveMetrics;
  const timeSeries = analyticsData?.timeSeriesData || [];
  const funnel = analyticsData?.funnel || [];
  const calendarRows = analyticsData?.monthlyCalendarRows || [];
  const topViewed = analyticsData?.topViewedProducts || [];
  const topSold = analyticsData?.topSellingProducts || [];

  return (
    <div className="space-y-6 pb-16 font-sans text-neutral-900">
      
      {/* Top Header & Live Telemetry Radar */}
      <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-950">
                  Website Analytics & Activity Monitor
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  100% Real Website Data
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                Live customer activity, session telemetry, acquisition growth & verified Supabase marketplace metrics
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Live Visitors Beacon */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{live?.liveVisitors ?? 0} Visitors Online Now</span>
            <span className="text-[10px] text-neutral-400 font-normal border-l border-neutral-700 pl-2">
              {live?.loggedInCount ?? 0} Users / {live?.guestCount ?? 0} Guests
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
            title="Refresh Real-time Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          {lastFetchTime && (
            <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline-block">
              Updated: {lastFetchTime}
            </span>
          )}
        </div>
      </div>

      {/* Date Filter & Range Selector Bar */}
      <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-extrabold text-neutral-800 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <span>Date Filter & Analytics Range</span>
          </div>
          {analyticsData?.dateRange && (
            <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-lg">
              Active Range: <strong className="text-neutral-900">{analyticsData.dateRange.currentStart}</strong> to <strong className="text-neutral-900">{analyticsData.dateRange.currentEnd}</strong>
            </span>
          )}
        </div>

        {/* Quick Presets Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'previous_day', label: 'Previous Day (2d ago)' },
            { id: 'last7days', label: 'Last 7 Days' },
            { id: 'thisweek', label: 'This Week' },
            { id: 'lastweek', label: 'Previous Week' },
            { id: 'thismonth', label: 'This Month' },
            { id: 'lastmonth', label: 'Previous Month' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePeriodChange(preset.id as PeriodPreset)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                period === preset.id
                  ? 'bg-neutral-950 text-white shadow-sm'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Range & Single Date historical pickers */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          {/* Custom Date Range Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-neutral-600">Custom Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-none focus:border-neutral-900 font-medium"
            />
            <span className="text-xs text-neutral-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-none focus:border-neutral-900 font-medium"
            />
            <button
              onClick={handleCustomApply}
              disabled={!startDate || !endDate}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all"
            >
              Apply Range
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-200 hidden md:block" />

          {/* Specific Historical Date Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-neutral-600">Inspect Single Date:</span>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-none focus:border-neutral-900 font-medium"
            />
            <button
              onClick={handleSingleDateApply}
              disabled={!singleDate}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all"
            >
              View Day
            </button>
          </div>
        </div>
      </div>

      {/* Error / Data Status Notice */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs">
            <strong>Data Notice:</strong> {error}. Real records will populate dynamically as database activities occur.
          </div>
        </div>
      )}

      {/* 4 PRIMARY TRADE-STYLE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Marketplace Revenue */}
        <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Marketplace Revenue
              </span>
              <div className="text-2xl font-black text-neutral-950">
                {formatPrice(rev?.currentRevenue ?? 0)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 font-bold">
              {rev?.growth?.trend === 'up' ? (
                <span className="flex items-center text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" /> {rev.growth.percentage}
                </span>
              ) : rev?.growth?.trend === 'down' ? (
                <span className="flex items-center text-rose-600">
                  <ArrowDownRight className="w-4 h-4" /> {rev.growth.percentage}
                </span>
              ) : (
                <span className="text-neutral-500">0.0% No Change</span>
              )}
              <span className="text-neutral-400 font-normal text-[11px]">vs prev period</span>
            </div>
            <span className="text-[11px] text-neutral-400 font-medium">
              Prev: {formatPrice(rev?.previousRevenue ?? 0)}
            </span>
          </div>
        </div>

        {/* 2. Order Distribution */}
        <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Order Volume
              </span>
              <div className="text-2xl font-black text-neutral-950">
                {orders?.total ?? 0} <span className="text-xs font-bold text-neutral-400">Orders</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-neutral-600 font-bold">
                {orders?.counts?.delivered ?? 0} Completed
              </span>
              <span className="text-neutral-300">|</span>
              <span className="text-[11px] text-neutral-600 font-bold">
                {orders?.counts?.processing ?? 0} In-Transit
              </span>
            </div>
            <span className="text-[11px] font-bold text-neutral-500">
              {orders?.counts?.pending ?? 0} Pending
            </span>
          </div>
        </div>

        {/* 3. Acquisition Velocity */}
        <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Acquisition Velocity
              </span>
              <div className="text-2xl font-black text-neutral-950">
                {acq?.currentNewUsers ?? 0} <span className="text-xs font-bold text-neutral-400">New Users</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 font-bold">
              {acq?.growth?.trend === 'up' ? (
                <span className="flex items-center text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" /> {acq.growth.percentage}
                </span>
              ) : acq?.growth?.trend === 'down' ? (
                <span className="flex items-center text-rose-600">
                  <ArrowDownRight className="w-4 h-4" /> {acq.growth.percentage}
                </span>
              ) : (
                <span className="text-neutral-500">0.0% No Change</span>
              )}
              <span className="text-neutral-400 font-normal text-[11px]">vs prev</span>
            </div>
            <span className="text-[11px] text-neutral-400 font-medium">
              Total: {acq?.totalCustomers ?? 0} Users
            </span>
          </div>
        </div>

        {/* 4. Enterprise Insights / AOV */}
        <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-neutral-300 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Average Order Value
              </span>
              <div className="text-2xl font-black text-neutral-950">
                {formatPrice(insights?.aov ?? 0)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-neutral-500 font-medium">
              All-Time Delivered:
            </span>
            <span className="text-xs font-bold text-neutral-900">
              {formatPrice(rev?.totalAllTimeDeliveredRevenue ?? 0)}
            </span>
          </div>
        </div>

      </div>

      {/* CORE WEBSITE TELEMETRY GRID (8 High-Impact Real-time Metrics) */}
      <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900">
              Website Traffic & Interaction Signals
            </h2>
            <p className="text-xs text-neutral-500 font-medium">
              Calculated exclusively from verified client browser sessions & database events
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg">
            Non-Bot Filter Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Visits</span>
            </div>
            <div className="text-lg font-black text-neutral-900">{web?.totalVisits ?? 0}</div>
            <span className="text-[10px] text-neutral-500 font-medium mt-1">Total Sessions</span>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Unique</span>
            </div>
            <div className="text-lg font-black text-neutral-900">{web?.uniqueVisitors ?? 0}</div>
            <span className="text-[10px] text-neutral-500 font-medium mt-1">Unique Visitors</span>
          </div>

          <div className="p-3.5 bg-neutral-950 text-white rounded-xl border border-neutral-900 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <Activity className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] font-bold uppercase text-emerald-400">Live</span>
            </div>
            <div className="text-lg font-black text-white">{live?.liveVisitors ?? 0}</div>
            <span className="text-[10px] text-neutral-400 font-medium mt-1">Active Now</span>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <UserCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Accounts</span>
            </div>
            <div className="text-lg font-black text-neutral-900">{web?.newAccounts ?? 0}</div>
            <span className="text-[10px] text-neutral-500 font-medium mt-1">New Signups</span>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Logins</span>
            </div>
            <div className="text-lg font-black text-neutral-900">{web?.uniqueLoginUsers ?? 0}</div>
            <span className="text-[10px] text-neutral-500 font-medium mt-1">{web?.loginEvents ?? 0} Total Events</span>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Views</span>
            </div>
            <div className="text-lg font-black text-neutral-900">{web?.productViews ?? 0}</div>
            <span className="text-[10px] text-neutral-500 font-medium mt-1">Product Views</span>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Cart</span>
            </div>
            <div className="text-lg font-black text-neutral-900">{web?.addToCart ?? 0}</div>
            <span className="text-[10px] text-neutral-500 font-medium mt-1">Add to Cart</span>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">Orders</span>
            </div>
            <div className="text-lg font-black text-neutral-900">{web?.orders ?? 0}</div>
            <span className="text-[10px] text-neutral-500 font-medium mt-1">{web?.completedOrders ?? 0} Delivered</span>
          </div>

        </div>
      </div>

      {/* HISTORICAL TREND CHARTS & TIME SERIES */}
      <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900">
              Daily Activity & Trend Chart
            </h2>
            <p className="text-xs text-neutral-500 font-medium">
              Continuous timeline generated strictly from real timestamped database points
            </p>
          </div>

          {/* Chart View Toggles */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveChartTab('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeChartTab === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Signals
            </button>
            <button
              onClick={() => setActiveChartTab('traffic')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeChartTab === 'traffic' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Visitors & Views
            </button>
            <button
              onClick={() => setActiveChartTab('sales')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeChartTab === 'sales' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Revenue & Orders
            </button>
          </div>
        </div>

        {/* Chart Rendering */}
        <div className="h-[280px] w-full">
          {timeSeries.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-neutral-400 font-medium">
              No historical activity in the selected range yet. Real data points will map dynamically.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'sales' ? (
                <BarChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="shortDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `৳${v}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Revenue') return [`৳${Number(value).toLocaleString()}`, name];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#18181b" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : activeChartTab === 'traffic' ? (
                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="shortDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="uniqueVisitors" name="Unique Visitors" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#colorVisits)" />
                  <Area type="monotone" dataKey="productViews" name="Product Views" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                </AreaChart>
              ) : (
                <LineChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="shortDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="uniqueVisitors" name="Visitors" stroke="#18181b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="productViews" name="Product Views" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="addToCart" name="Add to Cart" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="orders" name="Orders" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2 COLUMN GRID: CONVERSION FUNNEL & LIVE VISITOR RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* E-COMMERCE CONVERSION FUNNEL */}
        <div className="lg:col-span-6 bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900">
                E-Commerce Conversion Funnel
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                Step-by-step conversion dropoff from site visit to completed delivery
              </p>
            </div>
            <span className="text-xs font-bold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-lg">
              Overall: {funnel.length > 0 && web?.uniqueVisitors ? `${(( (web?.orders || 0) / (web.uniqueVisitors || 1) ) * 100).toFixed(1)}%` : '0.0%'}
            </span>
          </div>

          <div className="space-y-3">
            {funnel.map((step: any, idx: number) => {
              const maxCount = Math.max(1, funnel[0]?.count || 1);
              const percentageOfMax = Math.min(100, Math.max(4, Math.round((step.count / maxCount) * 100)));
              
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      {step.stage}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-neutral-950">{step.count.toLocaleString()}</span>
                      <span className="text-[11px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                        {step.rate}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neutral-950 transition-all duration-500 rounded-full"
                      style={{ width: `${percentageOfMax}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LIVE ACTIVE SESSIONS RADAR */}
        <div className="lg:col-span-6 bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900">
                  Live Active Sessions Radar
                </h2>
                <p className="text-xs text-neutral-500 font-medium">
                  Real-time active tabs and browsing locations (2 min idle threshold)
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {live?.liveVisitors ?? 0} Live
            </span>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {!live?.activeSessions || live.activeSessions.length === 0 ? (
              <div className="py-10 text-center text-xs text-neutral-400 font-medium">
                No active external customer sessions connected right now.
                <br />Active user tabs will appear here instantly when visited.
              </div>
            ) : (
              live.activeSessions.map((session: any, idx: number) => (
                <div 
                  key={session.sessionId || idx}
                  className="p-2.5 bg-neutral-50 hover:bg-neutral-100/80 rounded-xl border border-neutral-150 flex items-center justify-between text-xs transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-neutral-200 text-neutral-800 flex items-center justify-center shrink-0">
                      {session.device === 'Mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-neutral-900 truncate">
                        {session.isLoggedIn ? (
                          <span className="text-emerald-700 font-extrabold">● {session.userName || 'Logged-in Customer'}</span>
                        ) : (
                          <span className="text-neutral-700">Guest Visitor ({session.visitorId?.slice(0, 8)})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono truncate">
                        {session.currentPath}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] font-bold text-neutral-700">
                      Active Now
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 2 COLUMN GRID: TOP VIEWED PRODUCTS vs TOP SELLING PRODUCTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Real Top Viewed Products */}
        <div className="lg:col-span-6 bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900">
                Top Viewed Products
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                Customer curiosity & product page engagement signals
              </p>
            </div>
            <Eye className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-2.5">
            {topViewed.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No product detail page views recorded in this period yet.
              </div>
            ) : (
              topViewed.slice(0, 5).map((prod: any, idx: number) => (
                <div 
                  key={prod.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-150 transition-all text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 font-bold text-neutral-400 text-center">{idx + 1}</span>
                    {prod.image ? (
                      <img src={prod.image} alt={prod.name} className="w-9 h-9 rounded-lg object-cover border border-neutral-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-neutral-200 flex items-center justify-center font-bold text-neutral-600">
                        P
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-neutral-900 truncate max-w-[200px] sm:max-w-xs">{prod.name}</h4>
                      <span className="text-[10px] text-neutral-400 font-medium">{prod.category || 'General'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-neutral-900">{prod.count}</span>
                    <span className="text-[10px] text-neutral-400 block font-medium">views</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real Top Selling Products from Orders */}
        <div className="lg:col-span-6 bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900">
                Top Selling Products
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                Verified order item volume and sales revenue
              </p>
            </div>
            <ShoppingBag className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-2.5">
            {topSold.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No order sales recorded in this period yet.
              </div>
            ) : (
              topSold.slice(0, 5).map((prod: any, idx: number) => (
                <div 
                  key={prod.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-150 transition-all text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 font-bold text-neutral-400 text-center">{idx + 1}</span>
                    {prod.image ? (
                      <img src={prod.image} alt={prod.name} className="w-9 h-9 rounded-lg object-cover border border-neutral-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-neutral-200 flex items-center justify-center font-bold text-neutral-600">
                        P
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-neutral-900 truncate max-w-[200px] sm:max-w-xs">{prod.name}</h4>
                      <span className="text-[10px] text-neutral-400 font-medium">{prod.category || 'General'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-neutral-900">{formatPrice(prod.revenue)}</span>
                    <span className="text-[10px] text-neutral-400 block font-medium">{prod.unitsSold} units sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MONTHLY CALENDAR DAY-BY-DAY BREAKDOWN TABLE */}
      <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900">
              Daily Calendar Activity Breakdown Table
            </h2>
            <p className="text-xs text-neutral-500 font-medium">
              Daily audit log of verified visitors, logins, views, orders and gross sales
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg">
            {calendarRows.length} Days in Range
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Visits</th>
                <th className="py-2.5 px-3">Unique Visitors</th>
                <th className="py-2.5 px-3">New Users</th>
                <th className="py-2.5 px-3">Logins</th>
                <th className="py-2.5 px-3">Product Views</th>
                <th className="py-2.5 px-3">Add to Cart</th>
                <th className="py-2.5 px-3">Orders</th>
                <th className="py-2.5 px-3 text-right">Gross Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
              {calendarRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-neutral-400">
                    No timeline records available for selected range.
                  </td>
                </tr>
              ) : (
                calendarRows.map((row: any, idx: number) => (
                  <tr key={row.date || idx} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-neutral-900">
                      {row.formattedDate || row.date}
                    </td>
                    <td className="py-2.5 px-3">{row.visits}</td>
                    <td className="py-2.5 px-3 font-bold text-neutral-900">{row.visitors}</td>
                    <td className="py-2.5 px-3">{row.newUsers}</td>
                    <td className="py-2.5 px-3">{row.logins}</td>
                    <td className="py-2.5 px-3">{row.productViews}</td>
                    <td className="py-2.5 px-3">{row.addToCart}</td>
                    <td className="py-2.5 px-3">
                      {row.orders > 0 ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {row.orders} orders
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-neutral-950">
                      {formatPrice(row.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
