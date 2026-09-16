import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Truck, 
  ArrowLeft, 
  Save, 
  Check, 
  AlertCircle, 
  Upload, 
  Link as LinkIcon, 
  ShieldCheck, 
  Key, 
  Globe, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Layers, 
  Sliders, 
  ExternalLink 
} from 'lucide-react';
import { useCourierStore, CourierItem } from '../../../store/useCourierStore';

export default function AdminAddCourier() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { couriers, fetchCouriers, addCourier, updateCourier, testConnection, loading } = useCourierStore();

  const isEditing = Boolean(id);

  // Form States
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [authType, setAuthType] = useState<CourierItem['authType']>('api_key_secret');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneSearchEndpoint, setPhoneSearchEndpoint] = useState('/fraud_check/{phone}');
  const [orderHistoryEndpoint, setOrderHistoryEndpoint] = useState('');
  const [trackingEndpoint, setTrackingEndpoint] = useState('');
  const [statusEndpoint, setStatusEndpoint] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST'>('GET');
  const [requiredHeaders, setRequiredHeaders] = useState('');
  const [mappingType, setMappingType] = useState<CourierItem['mappingType']>('generic');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // UI States
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  useEffect(() => {
    if (isEditing && id && couriers.length > 0) {
      const found = couriers.find(c => c.id === id);
      if (found) {
        setName(found.name || '');
        setLogoUrl(found.logoUrl || '');
        setWebsiteUrl(found.websiteUrl || '');
        setApiBaseUrl(found.apiBaseUrl || '');
        setAuthType(found.authType || 'api_key_secret');
        setApiKey(found.hasApiKey ? '••••••••' : '');
        setSecretKey(found.hasSecretKey ? '••••••••' : '');
        setAccessToken(found.hasAccessToken ? '••••••••' : '');
        setClientId(found.clientId || '');
        setStoreId(found.storeId || '');
        setUsername(found.username || '');
        setPhoneSearchEndpoint(found.phoneSearchEndpoint || '/fraud_check/{phone}');
        setOrderHistoryEndpoint(found.orderHistoryEndpoint || '');
        setTrackingEndpoint(found.trackingEndpoint || '');
        setStatusEndpoint(found.statusEndpoint || '');
        setWebhookUrl(found.webhookUrl || '');
        setWebhookSecret(found.webhookSecret || '');
        setRequestMethod(found.requestMethod || 'GET');
        setRequiredHeaders(found.requiredHeaders || '');
        setMappingType(found.mappingType || 'generic');
        setStatus(found.status || 'active');
      }
    }
  }, [isEditing, id, couriers]);

  // Handle Logo Upload (Base64 file or direct URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError('Logo image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestConnection = async () => {
    if (!id && !apiBaseUrl) {
      setFormError('Please enter the API Base URL to test connection.');
      return;
    }

    setTestingConnection(true);
    setTestResult(null);
    setFormError(null);

    if (id) {
      const res = await testConnection(id);
      setTestingConnection(false);
      setTestResult({
        success: res.success,
        message: res.message || res.error || (res.success ? 'API Connected' : 'Connection failed')
      });
    } else {
      // For unsaved new courier, save first or ping directly
      setTestingConnection(false);
      setTestResult({
        success: false,
        message: 'Please save the courier configuration first to perform live connection test.'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim()) {
      setFormError('Courier Name is required.');
      return;
    }

    const payload: any = {
      name: name.trim(),
      logoUrl: logoUrl.trim(),
      websiteUrl: websiteUrl.trim(),
      apiBaseUrl: apiBaseUrl.trim(),
      authType,
      clientId: clientId.trim(),
      storeId: storeId.trim(),
      username: username.trim(),
      phoneSearchEndpoint: phoneSearchEndpoint.trim(),
      orderHistoryEndpoint: orderHistoryEndpoint.trim(),
      trackingEndpoint: trackingEndpoint.trim(),
      statusEndpoint: statusEndpoint.trim(),
      webhookUrl: webhookUrl.trim(),
      webhookSecret: webhookSecret.trim(),
      requestMethod,
      requiredHeaders: requiredHeaders.trim(),
      mappingType,
      status
    };

    // Only send secrets if modified (not starting with mask placeholder)
    if (apiKey && !apiKey.startsWith('••••')) payload.apiKey = apiKey.trim();
    if (secretKey && !secretKey.startsWith('••••')) payload.secretKey = secretKey.trim();
    if (accessToken && !accessToken.startsWith('••••')) payload.accessToken = accessToken.trim();
    if (password && !password.startsWith('••••')) payload.password = password.trim();

    if (isEditing && id) {
      const res = await updateCourier(id, payload);
      if (res.success) {
        setFormSuccess('Courier configuration updated successfully.');
        setTimeout(() => navigate('/admin/courier/list'), 1200);
      } else {
        setFormError(res.error || 'Failed to update courier');
      }
    } else {
      const res = await addCourier(payload);
      if (res.success) {
        setFormSuccess('New courier created and configured successfully.');
        setTimeout(() => navigate('/admin/courier/list'), 1200);
      } else {
        setFormError(res.error || 'Failed to add courier');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/courier/list')}
            className="p-2 border border-gray-300 hover:bg-gray-100 transition-colors text-gray-700"
            title="Back to Couriers"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-gray-800" />
              {isEditing ? 'Edit Courier Configuration' : 'Add New Courier'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Configure courier details, API credentials, endpoints and customer history search.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isEditing && (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {testingConnection ? (
                <RefreshCw className="w-4 h-4 animate-spin text-gray-600" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              )}
              Test Connection
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors"
          >
            <Save className="w-4 h-4" />
            {isEditing ? 'Save Changes' : 'Create Courier'}
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {formError && (
        <div className="p-3 border border-red-300 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-3 border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {testResult && (
        <div className={`p-3 border text-xs flex items-center gap-2 ${
          testResult.success ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'
        }`}>
          {testResult.success ? <Check className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />}
          <span className="font-medium">{testResult.message}</span>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-600" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Courier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Steadfast Courier, Pathao Courier, RedX"
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Courier Website URL
              </label>
              <div className="flex items-center border border-gray-300 focus-within:border-black">
                <span className="px-2.5 py-2 bg-gray-50 border-r border-gray-200 text-gray-400">
                  <Globe className="w-4 h-4" />
                </span>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://steadfast.com.bd"
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Courier Logo */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Courier Logo (Upload Image or Image URL)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Logo Preview */}
                <div className="w-16 h-16 border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Courier Logo Preview" 
                      className="w-full h-full object-contain p-1"
                      onError={() => {}}
                    />
                  ) : (
                    <Truck className="w-8 h-8 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Logo
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                    </label>
                    <span className="text-[11px] text-gray-400">PNG, JPG, SVG up to 2MB</span>
                  </div>

                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Or paste direct logo image URL..."
                    className="w-full px-3 py-1.5 border border-gray-300 text-xs focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>

            {/* Status & Preset Mapping */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Courier Status
              </label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black bg-white"
              >
                <option value="active">Active (Visible in Fraud Checker & Orders)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                API Protocol & Parser Template
              </label>
              <select
                value={mappingType}
                onChange={(e: any) => {
                  const val = e.target.value;
                  setMappingType(val);
                  if (val === 'steadfast') {
                    setAuthType('api_key_secret');
                    setPhoneSearchEndpoint('/fraud_check/{phone}');
                    setApiBaseUrl('https://portal.steadfast.com.bd/api/v1');
                    setStatusEndpoint('/get_balance');
                  } else if (val === 'pathao') {
                    setAuthType('bearer_token');
                    setPhoneSearchEndpoint('/orders?phone={phone}');
                    setApiBaseUrl('https://api-hermes.pathao.com/aladdin/api/v1');
                    setStatusEndpoint('/user/profile');
                  } else if (val === 'redx') {
                    setAuthType('bearer_token');
                    setPhoneSearchEndpoint('/orders?phone={phone}');
                    setApiBaseUrl('https://openapi.redx.com.bd/v1.0.0-beta');
                    setStatusEndpoint('/pickup-stores');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black bg-white"
              >
                <option value="generic">Generic / Custom Courier</option>
                <option value="steadfast">Steadfast Courier (Auto-Configured)</option>
                <option value="pathao">Pathao Courier (Auto-Configured)</option>
                <option value="redx">RedX (Auto-Configured)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: API Connectivity & Credentials */}
        <div className="border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-600" />
              API Connectivity & Credentials
            </h2>
            <span className="text-[11px] text-gray-400 font-mono">Server-Side Proxy Security</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="https://portal.steadfast.com.bd/api/v1"
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Authentication Type
                </label>
                <select
                  value={authType}
                  onChange={(e: any) => setAuthType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black bg-white"
                >
                  <option value="api_key_secret">API Key + Secret Key (Steadfast Standard)</option>
                  <option value="bearer_token">Bearer Token (OAuth / Access Token)</option>
                  <option value="basic_auth">Basic Auth (Username & Password)</option>
                  <option value="custom_headers">Custom Headers Only</option>
                  <option value="none">No Authentication</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  HTTP Request Method
                </label>
                <select
                  value={requestMethod}
                  onChange={(e: any) => setRequestMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black bg-white"
                >
                  <option value="GET">GET Request</option>
                  <option value="POST">POST Request</option>
                </select>
              </div>
            </div>

            {/* Conditional credential fields based on authType */}
            {(authType === 'api_key_secret' || authType === 'basic_auth') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    API Key / Client ID / Username
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={isEditing ? "Leave blank to keep current key" : "Enter API Key"}
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Secret Key / Client Secret / Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSecretKey ? "text" : "password"}
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder={isEditing ? "Leave blank to keep current secret" : "Enter Secret Key"}
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700"
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {authType === 'bearer_token' && (
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Access Token / Bearer Token
                </label>
                <div className="relative">
                  <input
                    type={showAccessToken ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={isEditing ? "Leave blank to keep current token" : "eyJhbGciOi..."}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700"
                  >
                    {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Optional Client ID & Store ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Client ID / Store ID (Optional)
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="e.g. 1024 or Store Code"
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Custom Required Headers (JSON Format, Optional)
                </label>
                <input
                  type="text"
                  value={requiredHeaders}
                  onChange={(e) => setRequiredHeaders(e.target.value)}
                  placeholder='{"Content-Type": "application/json"}'
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: API Endpoints & Fraud Check Configuration */}
        <div className="border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-gray-600" />
            API Endpoints Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone / Customer Search Endpoint <span className="text-emerald-600 font-normal">(Used in Fraud Checker)</span>
              </label>
              <input
                type="text"
                value={phoneSearchEndpoint}
                onChange={(e) => setPhoneSearchEndpoint(e.target.value)}
                placeholder="/fraud_check/{phone}"
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono text-xs"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Placeholder <code className="text-gray-700 font-semibold">{'{phone}'}</code> will automatically be replaced with customer phone.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Status / Ping Endpoint (Used for connection test)
              </label>
              <input
                type="text"
                value={statusEndpoint}
                onChange={(e) => setStatusEndpoint(e.target.value)}
                placeholder="/get_balance or /status"
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Order / Parcel History Endpoint (Optional)
              </label>
              <input
                type="text"
                value={orderHistoryEndpoint}
                onChange={(e) => setOrderHistoryEndpoint(e.target.value)}
                placeholder="/status_by_cid/{cid} or /orders"
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tracking Endpoint (Optional)
              </label>
              <input
                type="text"
                value={trackingEndpoint}
                onChange={(e) => setTrackingEndpoint(e.target.value)}
                placeholder="/status_by_trackingcode/{code}"
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Webhook URL (Optional)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yourstore.com/api/webhooks/courier"
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Webhook Secret (Optional)
              </label>
              <input
                type="text"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Webhook signature verification secret"
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-black font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/courier/list')}
            className="px-4 py-2 border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isEditing ? 'Save Changes' : 'Create Courier'}
          </button>
        </div>
      </form>
    </div>
  );
}
