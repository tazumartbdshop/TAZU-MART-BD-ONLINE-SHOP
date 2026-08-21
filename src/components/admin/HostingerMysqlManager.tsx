import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Server, ShieldCheck, ArrowRight, UploadCloud } from 'lucide-react';

export default function HostingerMysqlManager() {
  const [health, setHealth] = useState<{
    status: string;
    mode: string;
    database: string;
    host: string;
    user: string;
    latencyMs?: number;
    isMysqlConnected: boolean;
    message: string;
    error?: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    host: '',
    port: '3306',
    database: '',
    user: '',
    password: '',
    ssl: false
  });

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ count: number; text: string } | null>(null);

  const [serverIp, setServerIp] = useState<string>('');

  const fetchServerIp = async () => {
    try {
      const res = await fetch('/api/admin/server-ip');
      if (res.ok) {
        const data = await res.json();
        setServerIp(data.ip || '');
      }
    } catch (err) {
      console.warn("Failed to fetch server IP:", err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/admin/db-config');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        if (data.host && data.host !== 'unknown' && data.host !== 'Local Storage') {
          setFormData(prev => ({
            ...prev,
            host: data.host,
            database: data.database,
            user: data.user
          }));
        }
      }
    } catch (err) {
      console.warn("Failed to check DB health:", err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchServerIp();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.host || !formData.user) {
      setMessage({ type: 'error', text: 'Host and Username are required' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Connected to Hostinger MySQL successfully!' });
        await fetchHealth();
      } else {
        setMessage({ type: 'error', text: data.message || 'Connection failed. Please verify Hostinger Remote MySQL settings.' });
        await fetchHealth();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/db-sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncResult({ count: data.syncedCount, text: `Successfully synced ${data.syncedCount} items (Categories, Products, Banners, Orders) to Hostinger MySQL!` });
      } else {
        setSyncResult({ count: data.syncedCount, text: `Sync finished with notices: ${data.errors?.join(', ') || 'Partial sync'}` });
      }
    } catch (err: any) {
      setSyncResult({ count: 0, text: `Sync failed: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white border border-black p-6 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-black text-white">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-black">Hostinger MySQL Database Server</h3>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">Connect and sync directly with Hostinger phpMyAdmin (e.g. auth-db2141.hstgr.io)</p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          {health?.isMysqlConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Hostinger MySQL Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Local Fail-Safe Mode Active</span>
            </div>
          )}

          <button
            type="button"
            onClick={fetchHealth}
            className="p-2 border border-zinc-300 hover:bg-zinc-100 text-zinc-600 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {health?.message && (
        <div className={`p-3 text-xs border ${health.isMysqlConnected ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-zinc-50 border-zinc-200 text-zinc-700'}`}>
          <div className="flex items-start gap-2">
            <Server className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{health.message}</p>
              {health.latencyMs !== undefined && (
                <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">Response Latency: {health.latencyMs}ms | Host: {health.host} | DB: {health.database}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hostinger IP Whitelisting Instruction Box */}
      {serverIp && !health?.isMysqlConnected && (
        <div className="p-4 bg-amber-50/70 border border-amber-300 text-amber-900 text-xs rounded-[8px]">
          <div className="flex gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-bold uppercase tracking-wider text-amber-800 text-[10px]">Hostinger Remote MySQL Configuration Instruction:</p>
              <p className="font-semibold">
                আপনার Hostinger Database প্যানেলে কানেক্ট করার জন্য নিচের সার্ভার আউটবাউন্ড আইপিটি (Outbound IP) আপনার Hostinger hPanel-এর 
                <strong className="text-black font-black"> "Remote MySQL &gt; Allowed IP / Access Hosts" </strong> এ অবশ্যই যোগ (Whitelist) করতে হবে। অন্যথায় Hostinger কানেকশন রিফিউজ করবে।
              </p>
              <div className="flex items-center gap-2 mt-2 bg-white border border-amber-300 px-3 py-1.5 max-w-fit rounded-[6px]">
                <span className="text-[10px] uppercase font-black tracking-wider text-neutral-500">Your Server IP:</span>
                <span className="font-mono font-bold text-amber-950 bg-amber-100/50 px-2 py-0.5 rounded text-xs select-all cursor-pointer" title="Click to select all">{serverIp}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hostinger Configuration Form */}
      <form onSubmit={handleConnect} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
              Hostinger MySQL Host / IP *
            </label>
            <input
              type="text"
              placeholder="e.g. srv2141.hstgr.io or auth-db2141.hstgr.io or IP"
              value={formData.host}
              onChange={e => setFormData({ ...formData, host: e.target.value })}
              className="w-full h-11 px-3 border border-zinc-300 focus:border-black focus:outline-none text-xs font-mono"
              required
            />
            <p className="text-[10px] text-zinc-400 mt-1">Hostinger MySQL Server Host from your hPanel</p>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
              Port
            </label>
            <input
              type="text"
              placeholder="3306"
              value={formData.port}
              onChange={e => setFormData({ ...formData, port: e.target.value })}
              className="w-full h-11 px-3 border border-zinc-300 focus:border-black focus:outline-none text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
              Database Name *
            </label>
            <input
              type="text"
              placeholder="e.g. u123456789_tazu"
              value={formData.database}
              onChange={e => setFormData({ ...formData, database: e.target.value })}
              className="w-full h-11 px-3 border border-zinc-300 focus:border-black focus:outline-none text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
              MySQL Username *
            </label>
            <input
              type="text"
              placeholder="e.g. u123456789_admin"
              value={formData.user}
              onChange={e => setFormData({ ...formData, user: e.target.value })}
              className="w-full h-11 px-3 border border-zinc-300 focus:border-black focus:outline-none text-xs font-mono"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 mb-1">
              MySQL Password
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full h-11 px-3 border border-zinc-300 focus:border-black focus:outline-none text-xs font-mono"
            />
          </div>
        </div>

        {message && (
          <div className={`p-3 text-xs border font-medium ${message.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-colors disabled:bg-zinc-400 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{loading ? 'Testing & Connecting...' : 'Connect to Hostinger MySQL'}</span>
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !health?.isMysqlConnected}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-colors disabled:bg-zinc-300 disabled:text-zinc-500 cursor-pointer"
          >
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>{syncing ? 'Syncing All Data...' : 'Sync All Data to Hostinger MySQL'}</span>
          </button>
        </div>

        {syncResult && (
          <div className="p-3 text-xs bg-emerald-50 border border-emerald-300 text-emerald-900 font-medium">
            {syncResult.text}
          </div>
        )}
      </form>

      {/* Hostinger Remote MySQL Setup Guide */}
      <div className="bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-xs text-zinc-600">
        <h4 className="font-bold text-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <span>💡</span> Hostinger Remote MySQL Instructions:
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-zinc-600">
          <li>Log into your <strong>Hostinger hPanel</strong>.</li>
          <li>Go to <strong>Databases</strong> &rarr; <strong>Remote MySQL</strong>.</li>
          <li>In <strong>IP (IPv4 or IPv6)</strong>, enter <code>%</code> (to allow connections from Cloud Run) or click <strong>Any Host</strong>.</li>
          <li>Select your database from the dropdown and click <strong>Create</strong>.</li>
          <li>Copy your Database Name, Username, and Hostname into the form above and click <strong>Connect</strong>.</li>
        </ol>
      </div>
    </div>
  );
}
