import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserCheck, ShoppingBag, Eye, MapPin, Search, 
  Filter, Navigation, AlertCircle, EyeOff, Info,
  Phone, Clock, Laptop, Network, Check, RefreshCw, Smartphone, Monitor
} from 'lucide-react';

export default function AdminLiveTracking() {
  const [liveData, setLiveData] = useState<any>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchLiveMetrics = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await fetch('/api/analytics/live');
      if (res.ok) {
        const data = await res.json();
        setLiveData(data);
        if (data.activeSessions?.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data.activeSessions[0].sessionId);
        }
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn("Live telemetry fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchLiveMetrics();
    const interval = setInterval(() => {
      fetchLiveMetrics(true);
    }, 10000); // 10s live pulse
    return () => clearInterval(interval);
  }, [fetchLiveMetrics]);

  const activeSessions = liveData?.activeSessions || [];
  const selectedSession = activeSessions.find((s: any) => s.sessionId === selectedSessionId) || activeSessions[0];

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto font-sans text-neutral-900">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-200 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              Live Visitor & Customer Radar
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-ping"></span> Real-time
              </span>
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1 font-medium">
            Active browser tabs connected to TAZU MART BD right now (2 minute idle heartbeat)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{liveData?.liveVisitors ?? 0} Visitors Online</span>
          </div>

          <button
            onClick={() => fetchLiveMetrics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left Column: Active Visitor List */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[620px]">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 mb-3 flex items-center justify-between border-b pb-2">
            <span className="flex items-center gap-2">
              <Users className="text-neutral-900 w-4 h-4" /> Active Online Sessions
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              {activeSessions.length} Total
            </span>
          </h2>
          
          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {activeSessions.length === 0 ? (
              <div className="py-16 text-center text-xs text-neutral-400 font-medium">
                No active external customer tabs connected right now.
                <br />Active user tabs will appear here dynamically as customers browse the website.
              </div>
            ) : (
              activeSessions.map((session: any) => {
                const isSelected = selectedSession?.sessionId === session.sessionId;
                const timeDiff = Math.max(1, Math.round((Date.now() - session.firstSeen) / 1000));
                const mins = Math.floor(timeDiff / 60);
                const secs = timeDiff % 60;
                const timeStr = `${mins > 0 ? `${mins}m ` : ''}${secs}s`;

                return (
                  <div 
                    key={session.sessionId}
                    onClick={() => setSelectedSessionId(session.sessionId)}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm ring-2 ring-neutral-950/20' 
                        : session.isLoggedIn 
                        ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/80 text-neutral-900' 
                        : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/70 text-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold truncate">
                          {session.isLoggedIn ? (
                            <span>{session.userName || 'Logged-in Customer'}</span>
                          ) : (
                            <span>Guest ({session.visitorId?.slice(0, 8)})</span>
                          )}
                        </h4>
                        <p className={`text-[11px] truncate font-mono ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {session.currentPath}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        isSelected ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {timeStr}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Live Browsing Route & Page Title */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-[620px] flex flex-col">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
            <Navigation className="text-neutral-900 w-4 h-4" /> Active Browsing View
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {!selectedSession ? (
              <div className="py-16 text-center text-xs text-neutral-400">
                Select an active visitor on the left to inspect their real-time browsing path.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Current Active URL Path
                  </span>
                  <div className="text-sm font-mono font-bold text-neutral-900 break-all bg-white p-2.5 rounded-lg border border-neutral-200">
                    {selectedSession.currentPath}
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Document Page Title
                  </span>
                  <div className="text-xs font-bold text-neutral-800">
                    {selectedSession.pageTitle || 'TAZU MART BD'}
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Telemetry Session Heartbeat
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Last Active: {new Date(selectedSession.lastHeartbeat).toLocaleTimeString()}
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Session Actions Recorded
                  </span>
                  <div className="text-xs font-bold text-neutral-900">
                    {selectedSession.eventsCount || 1} Interactions in current session
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Session & Device Details */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-[620px] flex flex-col">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
            <Laptop className="text-neutral-900 w-4 h-4" /> Client Device & Privacy Specs
          </h2>
          
          <div className="space-y-4 pt-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {!selectedSession ? (
              <div className="py-16 text-center text-xs text-neutral-400">
                No session selected.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                  <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center text-sm font-bold">
                    {selectedSession.device === 'Mobile' ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  </div>
                  
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-neutral-900 truncate">
                      {selectedSession.userName || (selectedSession.isLoggedIn ? 'Customer' : 'Guest Visitor')}
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      {selectedSession.visitorId}
                    </p>
                  </div>
                </div>

                <div className="text-xs space-y-2.5 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 font-medium">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Device Type:</span> 
                    <span className="font-bold text-neutral-900">{selectedSession.device}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Status:</span> 
                    <span className={`font-bold ${selectedSession.isLoggedIn ? 'text-emerald-700' : 'text-neutral-700'}`}>
                      {selectedSession.isLoggedIn ? 'Authenticated User' : 'Anonymous Guest'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">First Connected:</span> 
                    <span className="font-mono text-neutral-800">{new Date(selectedSession.firstSeen).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Referrer:</span> 
                    <span className="font-medium text-neutral-800 truncate max-w-[150px]">{selectedSession.referrer || 'Direct'}</span>
                  </div>
                  <hr className="my-2 border-neutral-200" />
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Session ID:</span> 
                    <span className="font-mono text-[11px] text-neutral-700 truncate max-w-[140px]" title={selectedSession.sessionId}>{selectedSession.sessionId}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
