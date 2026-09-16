import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Loader2, 
  X, 
  Package, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Percent, 
  ArrowUpRight, 
  Settings,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface FraudCheckResult {
  success: boolean;
  configured?: boolean;
  phone?: string;
  found?: boolean;
  message?: string;
  error?: string;
  data?: {
    totalParcels: number;
    totalDelivered: number;
    totalCancelled: number | null;
    totalFraudReports: number;
    deliverySuccessRate: number | null;
    raw?: any;
  };
}

interface FraudCheckerBarProps {
  selectedPhone?: string;
  onClearExternalPhone?: () => void;
}

export const FraudCheckerBar: React.FC<FraudCheckerBarProps> = ({ 
  selectedPhone, 
  onClearExternalPhone 
}) => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<FraudCheckResult | null>(null);
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if Steadfast API is configured on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/fraud-check/status')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && typeof data.configured === 'boolean') {
          setApiConfigured(data.configured);
        }
      })
      .catch(() => {
        // Non-blocking status check
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // When external phone is passed (e.g. clicked from an order item), automatically load and check
  useEffect(() => {
    if (selectedPhone) {
      setPhoneNumber(selectedPhone);
      setValidationError(null);
      handleCheck(selectedPhone);
    }
  }, [selectedPhone]);

  // Normalize Bangladeshi phone number
  const normalizeNumber = (raw: string): string => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('8801') && digits.length === 13) {
      digits = digits.slice(2);
    } else if (digits.startsWith('880') && digits.length === 14) {
      digits = digits.slice(3);
    }
    return digits;
  };

  const handleCheck = async (targetPhone?: string) => {
    const rawToTest = targetPhone || phoneNumber;
    if (!rawToTest.trim()) {
      setValidationError('Please enter a customer mobile number');
      inputRef.current?.focus();
      return;
    }

    const normalized = normalizeNumber(rawToTest);

    if (normalized.length !== 11 || !/^01[3-9]\d{8}$/.test(normalized)) {
      setValidationError('Invalid format. Enter an 11-digit BD number (e.g. 017XXXXXXXX)');
      return;
    }

    setValidationError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/fraud-check?phone=${encodeURIComponent(normalized)}`, {
        headers: { 'Accept': 'application/json' }
      });
      const data: FraudCheckResult = await res.json();
      setResult(data);

      if (typeof data.configured === 'boolean') {
        setApiConfigured(data.configured);
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || 'Failed to connect to verification service'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPhoneNumber('');
    setResult(null);
    setValidationError(null);
    if (onClearExternalPhone) onClearExternalPhone();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCheck();
    }
  };

  return (
    <div className="bg-[#FAFBFD] border-b border-[#EEEEEE] px-4 py-3 sm:px-6 transition-all">
      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Title Tag */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black text-white text-[11px] font-bold tracking-wider uppercase rounded-none">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Fraud Checker</span>
          </div>
          {apiConfigured === false && (
            <button
              onClick={() => navigate('/admin/delivery/courier-api')}
              title="Steadfast Courier API credentials needed"
              className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-none font-semibold flex items-center gap-1 hover:bg-amber-100 transition-colors"
            >
              <Settings className="w-3 h-3" />
              <span>Configure API</span>
            </button>
          )}
        </div>

        {/* Input & Action */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter customer mobile number (e.g. 017XXXXXXXX)..."
              disabled={loading}
              className="w-full bg-white border border-[#DDDDDD] focus:border-black focus:ring-0 text-xs sm:text-sm px-3 py-1.5 pr-8 rounded-none text-black placeholder:text-neutral-400 outline-none transition-colors"
            />
            {phoneNumber && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black p-0.5"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleCheck()}
            disabled={loading || !phoneNumber.trim()}
            className="bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-none flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Check</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline Validation Error */}
      {validationError && (
        <div className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Result Display Section */}
      {result && (
        <div className="mt-2.5 pt-2.5 border-t border-[#EAEAEA] animate-in fade-in duration-150">
          {/* Unconfigured State */}
          {result.configured === false && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{result.error || 'Steadfast Courier API is not configured. Please enter your API Key and Secret Key.'}</span>
              </div>
              <button
                onClick={() => navigate('/admin/delivery/courier-api')}
                className="bg-amber-900 text-white text-[11px] font-bold px-2.5 py-1 hover:bg-black transition-colors shrink-0"
              >
                Configure Courier API
              </button>
            </div>
          )}

          {/* Error State */}
          {result.configured !== false && !result.success && result.error && (
            <div className="flex items-center justify-between gap-2 p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{result.error}</span>
              </div>
              <button
                onClick={() => handleCheck()}
                className="text-rose-700 hover:text-rose-900 p-1 shrink-0"
                title="Retry"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Success - No Courier History Found */}
          {result.success && result.found === false && (
            <div className="flex items-center justify-between gap-2 p-2.5 bg-neutral-100 border border-neutral-200 text-xs text-neutral-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-500 shrink-0" />
                <span>
                  <strong>{result.phone}</strong>: {result.message || 'No prior delivery history found in Steadfast Courier.'}
                </span>
              </div>
              <button
                onClick={handleClear}
                className="text-neutral-500 hover:text-black p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Success - Real Data Found */}
          {result.success && result.found === true && result.data && (
            <div className="bg-white border border-[#E0E0E0] p-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Phone & Provider Info */}
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-neutral-900 text-sm">
                    {result.phone}
                  </span>
                  <span className="bg-neutral-100 text-neutral-600 text-[10px] font-semibold px-1.5 py-0.5 border border-neutral-200">
                    Steadfast Courier
                  </span>
                </div>

                {/* Key Metrics Strip */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  {/* Total Parcels */}
                  <div className="flex items-center gap-1.5 text-neutral-700 bg-neutral-50 px-2.5 py-1 border border-neutral-200">
                    <Package className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span className="text-[11px] text-neutral-500 font-medium">Total:</span>
                    <strong className="text-black font-bold text-xs">{result.data.totalParcels}</strong>
                  </div>

                  {/* Delivered */}
                  <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] text-emerald-700 font-medium">Delivered:</span>
                    <strong className="font-bold text-xs">{result.data.totalDelivered}</strong>
                  </div>

                  {/* Cancelled / Returned */}
                  {result.data.totalCancelled !== null && (
                    <div className="flex items-center gap-1.5 text-rose-800 bg-rose-50 px-2.5 py-1 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-[11px] text-rose-700 font-medium">Cancelled:</span>
                      <strong className="font-bold text-xs">{result.data.totalCancelled}</strong>
                    </div>
                  )}

                  {/* Fraud Reports */}
                  {result.data.totalFraudReports > 0 ? (
                    <div className="flex items-center gap-1.5 text-amber-900 bg-amber-100 px-2.5 py-1 border border-amber-300 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="text-[11px]">Fraud Reports:</span>
                      <strong className="text-xs">{result.data.totalFraudReports}</strong>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-neutral-500 bg-neutral-50 px-2 py-1 border border-neutral-200 text-[11px]">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>0 Fraud Reports</span>
                    </div>
                  )}

                  {/* Delivery Success Rate */}
                  {result.data.deliverySuccessRate !== null && (
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 border font-bold text-xs ${
                        result.data.deliverySuccessRate >= 80
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : result.data.deliverySuccessRate >= 50
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-rose-600 text-white border-rose-700'
                      }`}
                    >
                      <Percent className="w-3 h-3" />
                      <span>{result.data.deliverySuccessRate}% Success</span>
                    </div>
                  )}
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-neutral-400 hover:text-black p-1 transition-colors ml-auto"
                  title="Close result"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
