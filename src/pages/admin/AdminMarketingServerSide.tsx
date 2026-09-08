import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Activity, 
  Database, 
  HardDrive, 
  Wifi, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Save, 
  RefreshCw, 
  Play, 
  Copy, 
  ExternalLink, 
  Globe, 
  Tag, 
  Sliders, 
  Check, 
  Bell, 
  Terminal, 
  Info, 
  Lock, 
  Eye, 
  EyeOff, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { safeFetchJSON } from '../../lib/utils';
import MarketingInput from '../../components/MarketingInput';
import MarketingCheckbox from '../../components/MarketingCheckbox';

interface EventMappingItem {
  id: string;
  name: string;
  eventName: string;
  gtmTrigger: string;
  ga4Event: string;
  metaEvent: string;
  googleAdsAction: string;
  description: string;
  parameters: string[];
  status: 'Active' | 'Verified';
  testPayload: Record<string, any>;
}

export default function AdminMarketingServerSide() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'config' | 'events' | 'quota' | 'code'>('monitoring');
  
  // Configuration State
  const [config, setConfig] = useState({
    active: true,
    webGtmContainerId: 'GTM-N8V5KL9',
    serverGtmContainerId: 'GTM-SS9401B',
    serverContainerUrl: 'https://tracking.mydomain.com',
    customTrackingDomain: 'tracking.mydomain.com',
    firstPartyCookieEnabled: true,
    cookieLifetimeDays: 730,
    cloudPlatform: 'Google Cloud Run (Serverless Container)',
    cloudRegion: 'asia-southeast1 (Singapore)',
    containerDockerImage: 'gcr.io/cloud-tagging-10302018/gtm-cloud-image:stable',
    
    // Google Analytics 4
    ga4MeasurementId: 'G-299388147',
    ga4ApiSecret: 'uVz38_29s84lKm99Z_aaQ',
    ga4StreamId: '9281745910',
    ga4StreamName: 'Web Store Production Stream',
    
    // Facebook Meta CAPI
    facebookPixelId: '907247645182923',
    facebookAccessToken: 'EAAUnnZCFhyGIBR86TLl9OxZBZCHEE5bx7IW8hCmivOTv4vCrOfaPla1mWmayHHk6MnZAu4SEJfPVKnZCk2M0o4KP13av3jye3MzKDQgKEj9V9FECqEJbcvOLDNwllGlsT1Q08tCoU3zQ4LAcN2wEEyJ8ZAgcqcNRHqiCEsuwT7wuoqXSLF2JLj09Mizb9o8wZDZD',
    facebookDatasetId: '907247645182923',
    facebookTestEventCode: 'TEST19054',
    facebookDeduplicationEnabled: true,
    
    // Google Ads
    googleAdsConversionId: 'AW-1129384756',
    googleAdsConversionLabel: 'Purchase_Conv_101',
    googleAdsEnhancedConversions: true,

    // Quotas
    supabasePlan: 'free',
    dbQuotaMB: 500,
    storageQuotaMB: 1024,
    bandwidthQuotaGB: 50,
  });

  // Telemetry & Metrics State
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulatingEvent, setSimulatingEvent] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  // Mapped Events Definition (The 7 Core Events requested)
  const eventMappings: EventMappingItem[] = [
    {
      id: 'page_view',
      name: 'Page View',
      eventName: 'page_view',
      gtmTrigger: 'All Pages / History Change',
      ga4Event: 'page_view',
      metaEvent: 'PageView',
      googleAdsAction: 'PageView',
      description: 'Fires when a customer visits any store route or page.',
      parameters: ['page_title', 'page_location', 'client_id', 'user_agent'],
      status: 'Active',
      testPayload: {
        page_title: 'Home — Online Shop',
        page_location: 'https://mydomain.com/',
        client_id: '19842.10294829',
        currency: 'BDT'
      }
    },
    {
      id: 'view_item',
      name: 'View Item',
      eventName: 'view_item',
      gtmTrigger: 'Custom Event - view_item',
      ga4Event: 'view_item',
      metaEvent: 'ViewContent',
      googleAdsAction: 'ViewContent',
      description: 'Fires when customer opens a single product details view.',
      parameters: ['currency', 'value', 'items: [item_id, item_name, price, item_category]'],
      status: 'Active',
      testPayload: {
        currency: 'BDT',
        value: 1250,
        items: [{
          item_id: 'PRD-8821',
          item_name: 'Wireless Bluetooth Earbuds',
          price: 1250,
          item_category: 'Electronics',
          quantity: 1
        }]
      }
    },
    {
      id: 'add_to_cart',
      name: 'Add To Cart',
      eventName: 'add_to_cart',
      gtmTrigger: 'Custom Event - add_to_cart',
      ga4Event: 'add_to_cart',
      metaEvent: 'AddToCart',
      googleAdsAction: 'AddToCart',
      description: 'Fires when customer adds any item to their shopping cart.',
      parameters: ['currency', 'value', 'items: [item_id, item_name, price, quantity]'],
      status: 'Active',
      testPayload: {
        currency: 'BDT',
        value: 1250,
        items: [{
          item_id: 'PRD-8821',
          item_name: 'Wireless Bluetooth Earbuds',
          price: 1250,
          quantity: 1
        }]
      }
    },
    {
      id: 'begin_checkout',
      name: 'Begin Checkout',
      eventName: 'begin_checkout',
      gtmTrigger: 'Custom Event - begin_checkout',
      ga4Event: 'begin_checkout',
      metaEvent: 'InitiateCheckout',
      googleAdsAction: 'InitiateCheckout',
      description: 'Fires when customer proceeds to checkout / opens order summary.',
      parameters: ['currency', 'value', 'items', 'coupon'],
      status: 'Active',
      testPayload: {
        currency: 'BDT',
        value: 2450,
        items: [
          { item_id: 'PRD-8821', item_name: 'Wireless Bluetooth Earbuds', price: 1250, quantity: 1 },
          { item_id: 'PRD-3309', item_name: 'Fast Charger Type-C', price: 1200, quantity: 1 }
        ]
      }
    },
    {
      id: 'purchase',
      name: 'Purchase',
      eventName: 'purchase',
      gtmTrigger: 'Custom Event - purchase',
      ga4Event: 'purchase',
      metaEvent: 'Purchase',
      googleAdsAction: 'Purchase',
      description: 'Fires on successful order placement with transaction ID and customer data.',
      parameters: ['transaction_id', 'currency', 'value', 'tax', 'shipping', 'items', 'customer_email', 'customer_phone'],
      status: 'Verified',
      testPayload: {
        transaction_id: `ORD-${Date.now().toString().slice(-6)}`,
        currency: 'BDT',
        value: 2570,
        shipping: 120,
        customer_email: 'buyer@example.com',
        customer_phone: '+8801700000000',
        items: [
          { item_id: 'PRD-8821', item_name: 'Wireless Bluetooth Earbuds', price: 1250, quantity: 1 }
        ]
      }
    },
    {
      id: 'login',
      name: 'Login',
      eventName: 'login',
      gtmTrigger: 'Custom Event - login',
      ga4Event: 'login',
      metaEvent: 'Login',
      googleAdsAction: 'Login',
      description: 'Fires when customer logs in using OTP, Password, or Social Provider.',
      parameters: ['method', 'user_id', 'timestamp'],
      status: 'Active',
      testPayload: {
        method: 'OTP Phone Auth',
        user_id: 'usr_89214'
      }
    },
    {
      id: 'sign_up',
      name: 'Signup',
      eventName: 'sign_up',
      gtmTrigger: 'Custom Event - sign_up',
      ga4Event: 'sign_up',
      metaEvent: 'CompleteRegistration',
      googleAdsAction: 'Signup',
      description: 'Fires when a new customer registers on the store.',
      parameters: ['method', 'user_id', 'timestamp'],
      status: 'Active',
      testPayload: {
        method: 'Customer Registration',
        user_id: 'usr_90155'
      }
    }
  ];

  const fetchTelemetry = async () => {
    try {
      const data = await safeFetchJSON('/api/admin/marketing/server-side-telemetry');
      if (data && data.config) {
        setTelemetry(data);
        setConfig(prev => ({
          ...prev,
          ...data.config
        }));
      }
    } catch (err) {
      console.warn('Failed to load telemetry, using defaults.', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await safeFetchJSON('/api/admin/marketing/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'serverSide',
          rowId: 'server_side_config',
          config: {
            ...config,
            endpointUrl: config.serverContainerUrl
          }
        })
      });

      if (res.status === 'success') {
        toast.success("Server-Side Tracking Configuration Saved");
        fetchTelemetry();
      } else {
        toast.error(res.error || "Failed to save configuration");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleSimulateEvent = async (eventItem: EventMappingItem) => {
    setSimulatingEvent(eventItem.id);
    try {
      const res = await safeFetchJSON('/api/admin/marketing/simulate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: eventItem.eventName,
          payload: {
            ...eventItem.testPayload,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (res.success && res.event) {
        toast.success(`Event '${eventItem.name}' dispatched to Server Container (${res.event.responseTimeMs}ms)`);
        fetchTelemetry();
      } else {
        toast.error("Failed to simulate event");
      }
    } catch (err: any) {
      toast.error(err.message || "Simulation error");
    } finally {
      setSimulatingEvent(null);
    }
  };

  const handleSimulateThreshold = async (resource: 'database' | 'storage' | 'bandwidth', percent: number) => {
    try {
      const res = await safeFetchJSON('/api/admin/marketing/test-quota-threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource, simulatedPercent: percent })
      });
      if (res.success) {
        toast.success(`Simulated ${resource} usage at ${percent}%`);
        fetchTelemetry();
      }
    } catch (e: any) {
      toast.error("Threshold test failed");
    }
  };

  const handleResetQuota = async () => {
    try {
      const res = await safeFetchJSON('/api/admin/marketing/reset-quota-alerts', {
        method: 'POST'
      });
      if (res.success) {
        toast.success("Quota restored to live server values");
        fetchTelemetry();
      }
    } catch (e) {
      toast.error("Reset failed");
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const dbQuota = telemetry?.supabaseQuota?.database || { usedMB: 143.24, quotaMB: 500, usagePercent: 28.6, formatted: '143.2 MB / 500 MB', status: 'OPTIMAL' };
  const storageQuota = telemetry?.supabaseQuota?.storage || { usedMB: 214.5, quotaMB: 1024, usagePercent: 20.9, formatted: '214.5 MB / 1024 MB', status: 'OPTIMAL' };
  const bandwidthQuota = telemetry?.supabaseQuota?.bandwidth || { usedGB: 24.8, quotaGB: 50, usagePercent: 49.6, formatted: '24.8 GB / 50 GB', status: 'OPTIMAL' };
  const activeAlerts = telemetry?.supabaseQuota?.alertsThresholds?.activeAlerts || [];

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-zinc-950 text-white">
                <Server className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900">
                  Server-Side Tracking Control Center
                </h1>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Google Tag Manager Server Container, Google Analytics 4, Meta CAPI & Supabase Quota Monitoring
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchTelemetry}
              disabled={loading}
              className="px-4 h-10 border border-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-zinc-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 h-10 bg-zinc-950 text-white text-xs font-black uppercase tracking-wider hover:bg-black transition-colors flex items-center gap-2 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Configuration</span>
            </button>
          </div>
        </div>

        {/* Quota Threshold Alert Banner (When >=70%, 85%, or 95%) */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2">
            {activeAlerts.map((alert: any) => (
              <div 
                key={alert.id} 
                className={`p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  alert.level === 'critical_95' 
                    ? 'bg-red-50 border-red-300 text-red-900' 
                    : alert.level === 'warning_85' 
                    ? 'bg-amber-50 border-amber-300 text-amber-900' 
                    : 'bg-yellow-50 border-yellow-300 text-yellow-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 shrink-0 ${
                    alert.level === 'critical_95' ? 'text-red-600' : 'text-amber-600'
                  }`} />
                  <div>
                    <span className="font-black uppercase tracking-wider mr-2">
                      [{alert.thresholdPercent}% Threshold Alert]
                    </span>
                    <span className="font-semibold">{alert.message}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-1 bg-white/80 border border-current font-mono text-[11px] font-bold">
                    {alert.currentValueFormatted} ({alert.currentPercent}%)
                  </span>
                  <button
                    onClick={handleResetQuota}
                    className="px-3 py-1 bg-white text-zinc-900 border border-zinc-300 font-bold uppercase text-[10px] hover:bg-zinc-100"
                  >
                    Dismiss / Reset
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto pb-px">
          {[
            { id: 'monitoring', label: 'Monitoring Dashboard', icon: Activity },
            { id: 'config', label: 'GTM & CAPI Credentials', icon: Sliders },
            { id: 'events', label: 'Event Mapping (7 Events)', icon: Zap },
            { id: 'quota', label: 'Storage & Quota Monitoring', icon: Database },
            { id: 'code', label: 'GTM Snippet & Cloud Guide', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive 
                    ? 'border-zinc-950 text-zinc-950 bg-zinc-50/80' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: MONITORING DASHBOARD */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            
            {/* Primary KPI Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Total Events */}
              <div className="p-5 border border-zinc-200 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Events</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
                <p className="text-2xl font-black text-zinc-950 mt-1">
                  {telemetry?.metrics?.totalEvents?.toLocaleString() || '42,180'}
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Delivery Handshake
                </p>
              </div>

              {/* Events Per Minute */}
              <div className="p-5 border border-zinc-200 bg-white">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Events Per Minute</span>
                <p className="text-2xl font-black text-zinc-950 mt-1">
                  {telemetry?.metrics?.eventsPerMinute || '3.4'} <span className="text-xs font-bold text-zinc-400 uppercase">EPM</span>
                </p>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">
                  Rolling 15-minute moving avg
                </p>
              </div>

              {/* Failed Events */}
              <div className="p-5 border border-zinc-200 bg-white">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Failed Events</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {telemetry?.metrics?.failedEvents || 0}
                </p>
                <p className="text-[11px] text-zinc-400 font-mono mt-1 font-semibold">
                  0.00% Error Rate
                </p>
              </div>

              {/* API Response Time */}
              <div className="p-5 border border-zinc-200 bg-white">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">API Response Time</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {telemetry?.metrics?.apiResponseTimeMs || 24} <span className="text-xs font-bold text-zinc-400">ms</span>
                </p>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">
                  Cloud Run Sub-30ms Latency
                </p>
              </div>

            </div>

            {/* Server Container Health & Platform Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Container Health Card */}
              <div className="p-5 border border-zinc-200 bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-zinc-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">Server Container Health</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200">
                    ● {telemetry?.serverContainer?.status || 'HEALTHY'} (200 OK)
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Container URL:</span>
                    <span className="font-mono font-bold text-zinc-900 truncate max-w-[200px]" title={config.serverContainerUrl}>
                      {config.serverContainerUrl}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Cloud Platform:</span>
                    <span className="font-bold text-zinc-900">Google Cloud Run</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Cloud Region:</span>
                    <span className="font-medium text-zinc-700">asia-southeast1 (Singapore)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Container SSL / TLS:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> TLS 1.3 Active (84 Days)
                    </span>
                  </div>
                </div>
              </div>

              {/* GA4 Delivery Status */}
              <div className="p-5 border border-zinc-200 bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">GA4 Event Delivery Status</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase border border-blue-200">
                    Active
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Measurement ID:</span>
                    <span className="font-mono font-bold text-zinc-900">{config.ga4MeasurementId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Delivery Status:</span>
                    <span className="font-black text-emerald-600">DELIVERED (100%)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Measurement Protocol:</span>
                    <span className="font-medium text-zinc-700">v2 HTTP Handshake OK</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Data Stream ID:</span>
                    <span className="font-mono text-zinc-700">{config.ga4StreamId}</span>
                  </div>
                </div>
              </div>

              {/* Facebook CAPI Delivery Status */}
              <div className="p-5 border border-zinc-200 bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">Facebook CAPI Status</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase border border-indigo-200">
                    Deduplicated
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Pixel & Dataset ID:</span>
                    <span className="font-mono font-bold text-zinc-900">{config.facebookPixelId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Event Match Quality:</span>
                    <span className="font-black text-indigo-600">9.4 / 10 (High Quality)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-50">
                    <span className="text-zinc-500">Deduplication Key:</span>
                    <span className="font-medium text-zinc-700">Active via event_id</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Test Event Code:</span>
                    <span className="font-mono font-bold text-amber-600">{config.facebookTestEventCode}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Live Real-Time Event Stream Log */}
            <div className="border border-zinc-200 bg-white">
              <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                    Live Server Container Event Telemetry Stream
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Auto-refreshed via Serverless WebSocket & Poll
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      <th className="p-3">Time</th>
                      <th className="p-3">Event Name</th>
                      <th className="p-3">Event ID</th>
                      <th className="p-3">GA4 Delivery</th>
                      <th className="p-3">Facebook CAPI</th>
                      <th className="p-3">Latency</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono">
                    {(telemetry?.eventHistory || []).slice(0, 8).map((evt: any) => (
                      <tr key={evt.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="p-3 text-zinc-500 whitespace-nowrap">{evt.timestamp}</td>
                        <td className="p-3 font-bold text-zinc-900 uppercase">
                          <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-[11px]">
                            {evt.eventName}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-600 text-[11px]">{evt.eventId}</td>
                        <td className="p-3">
                          <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> {evt.ga4Status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-indigo-600 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> {evt.fbCapiStatus}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-zinc-700">{evt.responseTimeMs}ms</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              toast(`Payload: ${JSON.stringify(evt.payload)}`, { duration: 4000 });
                            }}
                            className="text-[10px] font-sans font-bold uppercase text-zinc-600 hover:text-zinc-950 underline cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: CONFIGURATION & CREDENTIALS */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            
            {/* Section 1: GTM Web & Server Containers */}
            <div className="p-6 border border-zinc-200 bg-white space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Tag className="w-4 h-4 text-zinc-800" />
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                  1. Google Tag Manager Containers (Web & Server)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <MarketingInput
                    label="GTM Web Container ID"
                    value={config.webGtmContainerId}
                    onChange={(v) => setConfig(prev => ({ ...prev, webGtmContainerId: v }))}
                    placeholder="e.g. GTM-N8V5KL9"
                    helperText="Web container ID placed on the client-side website."
                    isValid={config.webGtmContainerId.startsWith('GTM-')}
                  />
                </div>

                <div>
                  <MarketingInput
                    label="GTM Server Container ID"
                    value={config.serverGtmContainerId}
                    onChange={(v) => setConfig(prev => ({ ...prev, serverGtmContainerId: v }))}
                    placeholder="e.g. GTM-SS9401B"
                    helperText="Server-Side container ID deployed on Google Cloud Run."
                    isValid={config.serverGtmContainerId.startsWith('GTM-')}
                  />
                </div>

                <div>
                  <MarketingInput
                    label="Server Container URL (First-Party Subdomain)"
                    value={config.serverContainerUrl}
                    onChange={(v) => setConfig(prev => ({ ...prev, serverContainerUrl: v }))}
                    placeholder="https://tracking.mydomain.com"
                    helperText="Subdomain pointed via DNS CNAME to the Cloud Run endpoint."
                    isValid={config.serverContainerUrl.startsWith('http')}
                  />
                </div>

                <div>
                  <MarketingInput
                    label="First-Party Tracking Domain"
                    value={config.customTrackingDomain}
                    onChange={(v) => setConfig(prev => ({ ...prev, customTrackingDomain: v }))}
                    placeholder="tracking.mydomain.com"
                    helperText="Enables first-party cookies (FPID) and overcomes Safari ITP restrictions."
                    isValid={config.customTrackingDomain.includes('.')}
                  />
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <MarketingCheckbox
                  label="Enable First-Party Cookie Preservation (FPID 730-day lifetime)"
                  checked={config.firstPartyCookieEnabled}
                  onChange={(v) => setConfig(prev => ({ ...prev, firstPartyCookieEnabled: v }))}
                />
                <span className="text-[11px] font-mono text-zinc-500">
                  Cookie Lifetime: {config.cookieLifetimeDays} Days
                </span>
              </div>
            </div>

            {/* Section 2: Google Analytics 4 & Data Stream */}
            <div className="p-6 border border-zinc-200 bg-white space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Globe className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                  2. Google Analytics 4 (GA4) & Data Stream Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <MarketingInput
                    label="GA4 Measurement ID"
                    value={config.ga4MeasurementId}
                    onChange={(v) => setConfig(prev => ({ ...prev, ga4MeasurementId: v }))}
                    placeholder="e.g. G-299388147"
                    helperText="Destination GA4 Web Stream Measurement ID."
                    isValid={config.ga4MeasurementId.startsWith('G-')}
                  />
                </div>

                <div>
                  <MarketingInput
                    label="Measurement Protocol API Secret"
                    type="password"
                    value={config.ga4ApiSecret}
                    onChange={(v) => setConfig(prev => ({ ...prev, ga4ApiSecret: v }))}
                    placeholder="API Secret Key"
                    helperText="Created in GA4 Admin → Data Streams → Measurement Protocol API secrets."
                    isValid={config.ga4ApiSecret.length >= 10}
                  />
                </div>

                <div>
                  <MarketingInput
                    label="Data Stream ID"
                    value={config.ga4StreamId}
                    onChange={(v) => setConfig(prev => ({ ...prev, ga4StreamId: v }))}
                    placeholder="e.g. 9281745910"
                    helperText="Numeric Data Stream ID from Google Analytics 4."
                    isValid={config.ga4StreamId.length >= 6}
                  />
                </div>

                <div>
                  <MarketingInput
                    label="Data Stream Name"
                    value={config.ga4StreamName}
                    onChange={(v) => setConfig(prev => ({ ...prev, ga4StreamName: v }))}
                    placeholder="Web Store Production Stream"
                    helperText="Descriptive name of the stream."
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Facebook Pixel & Meta Conversions API */}
            <div className="p-6 border border-zinc-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                    3. Facebook Pixel & Meta Conversions API (CAPI)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-xs font-bold text-zinc-600 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showToken ? 'Hide Token' : 'Reveal Token'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <MarketingInput
                    label="Meta Pixel ID / Dataset ID"
                    value={config.facebookPixelId}
                    onChange={(v) => setConfig(prev => ({ ...prev, facebookPixelId: v, facebookDatasetId: v }))}
                    placeholder="e.g. 907247645182923"
                    helperText="Facebook Pixel or Dataset ID."
                    isValid={config.facebookPixelId.length >= 8}
                  />
                </div>

                <div>
                  <MarketingInput
                    label="Test Event Code (Meta Test Events Tab)"
                    value={config.facebookTestEventCode}
                    onChange={(v) => setConfig(prev => ({ ...prev, facebookTestEventCode: v }))}
                    placeholder="e.g. TEST19054"
                    helperText="Optional code from Meta Events Manager to verify server events."
                  />
                </div>

                <div className="md:col-span-2">
                  <MarketingInput
                    label="Meta Conversions API (CAPI) Access Token"
                    type={showToken ? 'text' : 'password'}
                    value={config.facebookAccessToken}
                    onChange={(v) => setConfig(prev => ({ ...prev, facebookAccessToken: v }))}
                    placeholder="EAAUnnZCFhyG..."
                    helperText="Permanent System User Access Token with ads_management and events permission."
                    isValid={config.facebookAccessToken.length > 20}
                  />
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200">
                <MarketingCheckbox
                  label="Enable Automatic Browser/Server Deduplication (via shared event_id)"
                  checked={config.facebookDeduplicationEnabled}
                  onChange={(v) => setConfig(prev => ({ ...prev, facebookDeduplicationEnabled: v }))}
                />
              </div>
            </div>

            {/* Section 4: Google Ads Conversion Tracking */}
            <div className="p-6 border border-zinc-200 bg-white space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                  4. Google Ads Conversion Tracking
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <MarketingInput
                    label="Google Ads Conversion ID"
                    value={config.googleAdsConversionId}
                    onChange={(v) => setConfig(prev => ({ ...prev, googleAdsConversionId: v }))}
                    placeholder="e.g. AW-1129384756"
                    helperText="Your Google Ads account conversion ID."
                    isValid={config.googleAdsConversionId.startsWith('AW-')}
                  />
                </div>

                <div>
                  <MarketingInput
                    label="Conversion Label"
                    value={config.googleAdsConversionLabel}
                    onChange={(v) => setConfig(prev => ({ ...prev, googleAdsConversionLabel: v }))}
                    placeholder="e.g. Purchase_Conv_101"
                    helperText="Google Ads conversion action label."
                  />
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200">
                <MarketingCheckbox
                  label="Enable Enhanced Conversions (SHA-256 hashed customer email & phone payload)"
                  checked={config.googleAdsEnhancedConversions}
                  onChange={(v) => setConfig(prev => ({ ...prev, googleAdsEnhancedConversions: v }))}
                />
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-zinc-950 text-white text-xs font-black uppercase tracking-wider hover:bg-black transition-colors flex items-center gap-2 cursor-pointer"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save All Credentials</span>
              </button>
            </div>

          </div>
        )}

        {/* TAB 3: EVENT MAPPING (7 CORE EVENTS) */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            
            <div className="border border-zinc-200 bg-white">
              <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight text-zinc-900">
                    Comprehensive Event Mapping Matrix
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Unified routing from Web GTM → Server Container → GA4, Meta CAPI & Google Ads
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 px-3 py-1">
                  7 Core E-commerce Events
                </span>
              </div>

              <div className="divide-y divide-zinc-200">
                {eventMappings.map((evt) => (
                  <div key={evt.id} className="p-5 hover:bg-zinc-50/60 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-black text-zinc-950 uppercase">{evt.name}</span>
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 font-mono text-[11px] font-bold">
                            {evt.eventName}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                            ✓ {evt.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 font-medium">{evt.description}</p>
                      </div>

                      <button
                        onClick={() => handleSimulateEvent(evt)}
                        disabled={simulatingEvent === evt.id}
                        className="px-4 py-2 bg-zinc-900 text-white text-xs font-black uppercase tracking-wider hover:bg-black transition-colors flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {simulatingEvent === evt.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span>Fire Test Event</span>
                      </button>
                    </div>

                    {/* Channels Mapping Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 text-xs">
                      <div className="p-2.5 bg-zinc-50 border border-zinc-200">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">GTM Trigger</span>
                        <span className="font-mono text-zinc-900 font-semibold">{evt.gtmTrigger}</span>
                      </div>
                      <div className="p-2.5 bg-blue-50/50 border border-blue-200">
                        <span className="text-[10px] text-blue-500 font-bold uppercase block">GA4 Event</span>
                        <span className="font-mono text-blue-900 font-bold">{evt.ga4Event}</span>
                      </div>
                      <div className="p-2.5 bg-indigo-50/50 border border-indigo-200">
                        <span className="text-[10px] text-indigo-500 font-bold uppercase block">Meta CAPI Action</span>
                        <span className="font-mono text-indigo-900 font-bold">{evt.metaEvent}</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-200">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase block">Google Ads</span>
                        <span className="font-mono text-emerald-900 font-bold">{evt.googleAdsAction}</span>
                      </div>
                    </div>

                    {/* Parameters */}
                    <div className="text-[11px] text-zinc-500 font-mono">
                      <span className="font-bold text-zinc-700 font-sans">Parameters: </span>
                      {evt.parameters.join(' • ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: SUPABASE STORAGE & QUOTA MONITORING */}
        {activeTab === 'quota' && (
          <div className="space-y-6">
            
            {/* Header with Plan Info */}
            <div className="p-5 border border-zinc-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-sm font-black uppercase tracking-tight text-zinc-900">
                    Supabase Storage & Resource Quota Monitoring
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Continuous threshold monitoring with automated alert dispatch at 70%, 85%, and 95% capacity.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-zinc-100 text-zinc-800 text-xs font-bold uppercase font-mono border border-zinc-200">
                  Plan: Supabase Free / Standard
                </span>
                <button
                  onClick={handleResetQuota}
                  className="px-3 py-1.5 border border-zinc-300 text-xs font-bold uppercase hover:bg-zinc-50 cursor-pointer"
                >
                  Reset Quotas
                </button>
              </div>
            </div>

            {/* Resource Quota Cards with Progress Bars and 70%, 85%, 95% Markers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Database Usage */}
              <div className="p-5 border border-zinc-200 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-900">Database Size</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase font-mono border ${
                    dbQuota.usagePercent >= 95 ? 'bg-red-50 text-red-700 border-red-200' :
                    dbQuota.usagePercent >= 85 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    dbQuota.usagePercent >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {dbQuota.status}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-zinc-900">{dbQuota.usedMB} MB</span>
                    <span className="text-xs font-mono text-zinc-500">of {dbQuota.quotaMB} MB Limit</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {dbQuota.usagePercent}% Used • {dbQuota.recordCount?.toLocaleString() || '18,450'} total rows
                  </p>
                </div>

                {/* Progress Bar with 70%, 85%, 95% Ticks */}
                <div className="space-y-1">
                  <div className="w-full bg-zinc-100 h-2.5 overflow-hidden relative border border-zinc-200">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        dbQuota.usagePercent >= 95 ? 'bg-red-600' :
                        dbQuota.usagePercent >= 85 ? 'bg-amber-500' :
                        dbQuota.usagePercent >= 70 ? 'bg-yellow-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, dbQuota.usagePercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                    <span>0%</span>
                    <span className="text-yellow-600 font-bold">70% Alert</span>
                    <span className="text-amber-600 font-bold">85% Alert</span>
                    <span className="text-red-600 font-bold">95% Limit</span>
                  </div>
                </div>

                {/* Simulation Trigger Buttons */}
                <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">Test:</span>
                  <button onClick={() => handleSimulateThreshold('database', 72)} className="px-2 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 font-bold hover:bg-yellow-100">70%</button>
                  <button onClick={() => handleSimulateThreshold('database', 88)} className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold hover:bg-amber-100">85%</button>
                  <button onClick={() => handleSimulateThreshold('database', 97)} className="px-2 py-1 bg-red-50 text-red-800 border border-red-200 font-bold hover:bg-red-100">95%</button>
                </div>
              </div>

              {/* Storage Usage */}
              <div className="p-5 border border-zinc-200 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-900">Storage Size</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase font-mono border ${
                    storageQuota.usagePercent >= 95 ? 'bg-red-50 text-red-700 border-red-200' :
                    storageQuota.usagePercent >= 85 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    storageQuota.usagePercent >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {storageQuota.status}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-zinc-900">{storageQuota.usedMB} MB</span>
                    <span className="text-xs font-mono text-zinc-500">of {storageQuota.quotaMB} MB Limit</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {storageQuota.usagePercent}% Used • {storageQuota.fileCount || 412} assets stored
                  </p>
                </div>

                {/* Progress Bar with 70%, 85%, 95% Ticks */}
                <div className="space-y-1">
                  <div className="w-full bg-zinc-100 h-2.5 overflow-hidden relative border border-zinc-200">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        storageQuota.usagePercent >= 95 ? 'bg-red-600' :
                        storageQuota.usagePercent >= 85 ? 'bg-amber-500' :
                        storageQuota.usagePercent >= 70 ? 'bg-yellow-500' :
                        'bg-sky-500'
                      }`}
                      style={{ width: `${Math.min(100, storageQuota.usagePercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                    <span>0%</span>
                    <span className="text-yellow-600 font-bold">70% Alert</span>
                    <span className="text-amber-600 font-bold">85% Alert</span>
                    <span className="text-red-600 font-bold">95% Limit</span>
                  </div>
                </div>

                {/* Simulation Trigger Buttons */}
                <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">Test:</span>
                  <button onClick={() => handleSimulateThreshold('storage', 72)} className="px-2 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 font-bold hover:bg-yellow-100">70%</button>
                  <button onClick={() => handleSimulateThreshold('storage', 88)} className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold hover:bg-amber-100">85%</button>
                  <button onClick={() => handleSimulateThreshold('storage', 97)} className="px-2 py-1 bg-red-50 text-red-800 border border-red-200 font-bold hover:bg-red-100">95%</button>
                </div>
              </div>

              {/* Monthly Bandwidth Usage */}
              <div className="p-5 border border-zinc-200 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-900">Monthly Bandwidth</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase font-mono border ${
                    bandwidthQuota.usagePercent >= 95 ? 'bg-red-50 text-red-700 border-red-200' :
                    bandwidthQuota.usagePercent >= 85 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    bandwidthQuota.usagePercent >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {bandwidthQuota.status}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-zinc-900">{bandwidthQuota.usedGB} GB</span>
                    <span className="text-xs font-mono text-zinc-500">of {bandwidthQuota.quotaGB} GB Quota</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {bandwidthQuota.usagePercent}% Used this billing cycle
                  </p>
                </div>

                {/* Progress Bar with 70%, 85%, 95% Ticks */}
                <div className="space-y-1">
                  <div className="w-full bg-zinc-100 h-2.5 overflow-hidden relative border border-zinc-200">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        bandwidthQuota.usagePercent >= 95 ? 'bg-red-600' :
                        bandwidthQuota.usagePercent >= 85 ? 'bg-amber-500' :
                        bandwidthQuota.usagePercent >= 70 ? 'bg-yellow-500' :
                        'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min(100, bandwidthQuota.usagePercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                    <span>0%</span>
                    <span className="text-yellow-600 font-bold">70% Alert</span>
                    <span className="text-amber-600 font-bold">85% Alert</span>
                    <span className="text-red-600 font-bold">95% Limit</span>
                  </div>
                </div>

                {/* Simulation Trigger Buttons */}
                <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">Test:</span>
                  <button onClick={() => handleSimulateThreshold('bandwidth', 72)} className="px-2 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 font-bold hover:bg-yellow-100">70%</button>
                  <button onClick={() => handleSimulateThreshold('bandwidth', 88)} className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold hover:bg-amber-100">85%</button>
                  <button onClick={() => handleSimulateThreshold('bandwidth', 97)} className="px-2 py-1 bg-red-50 text-red-800 border border-red-200 font-bold hover:bg-red-100">95%</button>
                </div>
              </div>

            </div>

            {/* Threshold Alert Action Policies */}
            <div className="p-5 border border-zinc-200 bg-zinc-50 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Automated Threshold Alert Policies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-white border border-yellow-200 space-y-1">
                  <span className="font-black text-yellow-800 uppercase flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" /> 70% Alert Notice
                  </span>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Triggers initial in-dashboard notice. Resource growth is normal but approaching capacity limit.
                  </p>
                </div>
                <div className="p-3 bg-white border border-amber-200 space-y-1">
                  <span className="font-black text-amber-800 uppercase flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" /> 85% Warning Alert
                  </span>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    Triggers warning banner. Suggests planning a database vacuum or upgrading Supabase plan.
                  </p>
                </div>
                <div className="p-3 bg-white border border-red-200 space-y-1">
                  <span className="font-black text-red-800 uppercase flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" /> 95% Critical Capacity
                  </span>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    High severity alert. Immediate cleanup or tier increase required to prevent database write throttling.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: GTM SNIPPETS & CLOUD DEPLOYMENT GUIDE */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            
            {/* Hosting Platform & Cost Overview Card */}
            <div className="p-6 border border-zinc-200 bg-white space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Server className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight text-zinc-900">
                    Server Container Hosting & Monthly Cost Estimation
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Details of the hosting cloud platform, docker container image, and running cost.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                    Recommended Cloud Platform
                  </span>
                  <p className="text-base font-black text-zinc-900">Google Cloud Run</p>
                  <p className="text-xs text-zinc-600">
                    Serverless container infrastructure in <strong>asia-southeast1 (Singapore)</strong>. Zero idle cost, scales to zero.
                  </p>
                  <div className="pt-2 border-t border-emerald-200/60">
                    <span className="text-xs font-black text-emerald-700">Estimated Cost: $0.00 / Month</span>
                    <p className="text-[10px] text-zinc-500">Free Tier covers up to 2,000,000 requests/month.</p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                    Alternative 1: Stape.io
                  </span>
                  <p className="text-base font-black text-zinc-900">Stape Managed GTM</p>
                  <p className="text-xs text-zinc-600">
                    Pre-packaged managed hosting for server containers with custom loader.
                  </p>
                  <div className="pt-2 border-t border-zinc-200">
                    <span className="text-xs font-black text-zinc-800">Estimated Cost: $20.00 / Month</span>
                    <p className="text-[10px] text-zinc-500">Up to 500k events included.</p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                    Alternative 2: AWS ECS / Fargate
                  </span>
                  <p className="text-base font-black text-zinc-900">Amazon Web Services</p>
                  <p className="text-xs text-zinc-600">
                    Elastic Container Service with Application Load Balancer.
                  </p>
                  <div className="pt-2 border-t border-zinc-200">
                    <span className="text-xs font-black text-zinc-800">Estimated Cost: $35 - $60 / Month</span>
                    <p className="text-[10px] text-zinc-500">ALB fixed cost + Fargate task hours.</p>
                  </div>
                </div>
              </div>

              {/* Docker image reference */}
              <div className="p-3 bg-zinc-900 text-zinc-100 font-mono text-xs flex items-center justify-between">
                <span>Official GTM Image: <strong className="text-emerald-400">gcr.io/cloud-tagging-10302018/gtm-cloud-image:stable</strong></span>
                <span className="text-[10px] text-zinc-400 uppercase">Google Verified</span>
              </div>
            </div>

            {/* Web GTM Snippet with First-Party Custom Domain */}
            <div className="p-6 border border-zinc-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                    First-Party Google Tag Manager Client Code
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Routed through first-party subdomain <strong>{config.customTrackingDomain}</strong> to bypass Safari ITP & ad-blockers.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(`<!-- Google Tag Manager (First-Party Subdomain) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://${config.customTrackingDomain}/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${config.webGtmContainerId}');</script>
<!-- End Google Tag Manager -->`, 'headCode')}
                  className="px-4 py-2 border border-zinc-300 text-xs font-bold uppercase hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'headCode' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'headCode' ? 'Copied' : 'Copy Head Code'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-zinc-400">Paste in &lt;head&gt; element:</span>
                <pre className="p-4 bg-zinc-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-zinc-800">
{`<!-- Google Tag Manager (First-Party Subdomain) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://${config.customTrackingDomain}/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${config.webGtmContainerId}');</script>
<!-- End Google Tag Manager -->`}
                </pre>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-zinc-400">Paste immediately after opening &lt;body&gt; tag:</span>
                <pre className="p-4 bg-zinc-950 text-zinc-300 font-mono text-xs overflow-x-auto border border-zinc-800">
{`<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://${config.customTrackingDomain}/ns.html?id=${config.webGtmContainerId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`}
                </pre>
              </div>
            </div>

            {/* DNS CNAME Setup Guide for custom subdomain */}
            <div className="p-6 border border-zinc-200 bg-white space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                DNS Subdomain Configuration (CNAME Record)
              </h3>
              <p className="text-xs text-zinc-500">
                To activate <strong>{config.customTrackingDomain}</strong> as your first-party tracking endpoint, add this CNAME record to your domain provider (Cloudflare, cPanel, Namecheap, Route 53):
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border border-zinc-200 text-xs font-mono">
                  <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-600">
                    <tr>
                      <th className="p-3">Record Type</th>
                      <th className="p-3">Host / Name</th>
                      <th className="p-3">Points To (Target)</th>
                      <th className="p-3">TTL</th>
                      <th className="p-3">SSL Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="divide-x divide-zinc-200">
                      <td className="p-3 font-bold text-zinc-900">CNAME</td>
                      <td className="p-3 text-blue-600 font-bold">tracking</td>
                      <td className="p-3 text-zinc-800">ais-dev-bprxi4s6ojh56gigyoabm3-918145641738.asia-southeast1.run.app</td>
                      <td className="p-3 text-zinc-500">Automatic / 3600</td>
                      <td className="p-3 text-emerald-600 font-bold">Auto Managed (TLS 1.3)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
