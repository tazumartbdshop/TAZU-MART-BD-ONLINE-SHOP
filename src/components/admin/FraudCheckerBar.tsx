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
  RefreshCw,
  Truck,
  ExternalLink,
  ChevronDown,
  Clock,
  MapPin,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCourierStore, FraudCheckResponse, CourierItem } from '../../store/useCourierStore';

interface FraudCheckerBarProps {
  selectedPhone?: string;
  onClearExternalPhone?: () => void;
  compactMode?: boolean;
}

export const FraudCheckerBar: React.FC<FraudCheckerBarProps> = ({ 
  selectedPhone, 
  onClearExternalPhone,
  compactMode = false
}) => {
  const navigate = useNavigate();
  const { couriers, fetchCouriers, executeFraudCheck } = useCourierStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<FraudCheckResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch couriers on mount
  useEffect(() => {
    fetchCouriers().then((list) => {
      if (list && list.length > 0) {
        const active = list.find(c => c.status === 'active');
        if (active) {
          setSelectedCourierId(active.id);
        } else {
          setSelectedCourierId(list[0].id);
        }
      }
    });
  }, [fetchCouriers]);

  // Active couriers only
  const activeCouriers = couriers.filter(c => c.status === 'active');
  const selectedCourier = couriers.find(c => c.id === selectedCourierId) || activeCouriers[0];

  // Auto-fill and check when external phone is passed
  useEffect(() => {
    if (selectedPhone) {
      setPhoneNumber(selectedPhone);
      setValidationError(null);
      handleCheck(selectedPhone, selectedCourierId);
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

  const handleCheck = async (targetPhone?: string, targetCourierId?: string) => {
    const rawToTest = targetPhone || phoneNumber;
    if (!rawToTest.trim()) {
      setValidationError('Please enter a customer mobile number');
      inputRef.current?.focus();
      return;
    }

    const normalized = normalizeNumber(rawToTest);
    if (normalized.length !== 11 || !/^01[3-9]\d{8}$/.test(normalized)) {
      setValidationError('Invalid mobile number format (must be 11 digits starting with 013-019)');
      return;
    }

    setValidationError(null);
    setLoading(true);

    try {
      const courierToUse = targetCourierId || selectedCourierId;
      const data = await executeFraudCheck(normalized, courierToUse);
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        error: "Unable to fetch courier data. Please check courier API connection."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPhoneNumber('');
    setResult(null);
    setValidationError(null);
    if (onClearExternalPhone) {
      onClearExternalPhone();
    }
  };

  return (
    <div className="border border-gray-300 bg-white">
      {/* Top Bar / Input Form */}
      <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Title & Dynamic Courier Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 pr-2 border-r border-gray-300">
              <ShieldAlert className="w-5 h-5 text-gray-900" />
              <span className="font-bold text-gray-900 text-sm tracking-tight uppercase">
                Fraud Checker
              </span>
            </div>

            {/* Selected Courier Badge & Dynamic Dropdown */}
            <div className="flex items-center gap-2">
              {/* Courier Logo */}
              <div className="w-7 h-7 border border-gray-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {selectedCourier?.logoUrl ? (
                  <img
                    src={selectedCourier.logoUrl}
                    alt={selectedCourier.name}
                    className="w-full h-full object-contain p-0.5"
                    onError={(e: any) => {
                      e.target.onerror = null;
                      e.target.src = '';
                    }}
                  />
                ) : (
                  <Truck className="w-4 h-4 text-gray-400" />
                )}
              </div>

              {/* Dynamic Dropdown */}
              <div className="relative">
                <select
                  value={selectedCourierId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedCourierId(newId);
                    if (phoneNumber) {
                      handleCheck(phoneNumber, newId);
                    }
                  }}
                  className="appearance-none bg-white border border-gray-300 text-xs font-semibold text-gray-900 pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-black cursor-pointer"
                >
                  {activeCouriers.length === 0 ? (
                    <option value="">No Active Courier Found</option>
                  ) : (
                    activeCouriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2 top-2.5 pointer-events-none" />
              </div>

              <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 border border-emerald-300">
                Real-Time API
              </span>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="flex-1 max-w-xl">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleCheck();
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  ref={inputRef}
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Enter customer mobile number (e.g. 017XXXXXXXX)"
                  className="w-full pl-9 pr-8 py-1.5 border border-gray-300 text-xs sm:text-sm focus:outline-none focus:border-black bg-white font-mono"
                />
                {phoneNumber && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors flex items-center gap-1.5 shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Check
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Output Results Section */}
      {result && (
        <div className="p-4 space-y-4">
          {/* Header of Search Result */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Customer Phone:</span>
              <span className="text-sm font-bold text-gray-900 font-mono">
                {result.phone || phoneNumber}
              </span>
              {result.courier && (
                <span className="text-xs text-gray-500 flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-300">
                  <span>via</span>
                  <span className="font-semibold text-gray-900">{result.courier.name}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear Results
            </button>
          </div>

          {/* Failure / Unconfigured Case */}
          {result.configured === false && (
            <div className="p-3 border border-amber-300 bg-amber-50 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{result.error || `${selectedCourier?.name || 'Courier'} API credentials are not configured.`}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate(selectedCourier?.id ? `/admin/courier/edit/${selectedCourier.id}` : '/admin/courier/list')}
                className="px-2.5 py-1 bg-amber-800 text-white text-[11px] font-semibold hover:bg-amber-900 transition-colors shrink-0"
              >
                Configure Courier
              </button>
            </div>
          )}

          {/* Connection Error Message */}
          {result.success === false && result.configured !== false && (
            <div className="p-3 border border-red-300 bg-red-50 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{result.error || "Unable to fetch courier data. Please check courier API connection."}</span>
            </div>
          )}

          {/* Not Found / No History Message (Section 4 Requirement) */}
          {result.success && !result.found && (
            <div className="py-6 text-center text-gray-500 border border-dashed border-gray-300 bg-gray-50/50">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-800">
                {result.message || "No courier history found for this phone number."}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                This customer does not have any recorded parcel records with {selectedCourier?.name || 'this courier'}.
              </p>
            </div>
          )}

          {/* Live Data Found - Grid Cards */}
          {result.success && result.found && result.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {/* Total Parcels */}
                <div className="border border-gray-200 bg-gray-50 p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                    Total Orders
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">
                    {result.data.totalParcels}
                  </div>
                </div>

                {/* Delivered */}
                <div className="border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold mb-1">
                    Delivered
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-800">
                    {result.data.totalDelivered}
                  </div>
                </div>

                {/* Cancelled */}
                <div className="border border-red-200 bg-red-50/50 p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-red-700 font-semibold mb-1">
                    Cancelled
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-red-800">
                    {result.data.totalCancelled !== null ? result.data.totalCancelled : 'N/A'}
                  </div>
                </div>

                {/* Returned (if available) */}
                <div className="border border-amber-200 bg-amber-50/50 p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold mb-1">
                    Returned
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-amber-800">
                    {result.data.totalReturned !== null ? result.data.totalReturned : '0'}
                  </div>
                </div>

                {/* Pending */}
                <div className="border border-blue-200 bg-blue-50/50 p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-blue-700 font-semibold mb-1">
                    Pending
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-800">
                    {result.data.totalPending !== null ? result.data.totalPending : '0'}
                  </div>
                </div>

                {/* Success Rate */}
                <div className="border border-gray-900 bg-gray-900 text-white p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-gray-300 font-semibold mb-1">
                    Delivery Rate
                  </div>
                  <div className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-0.5">
                    {result.data.deliverySuccessRate !== null ? (
                      <>
                        <span>{result.data.deliverySuccessRate}</span>
                        <span className="text-xs font-normal">%</span>
                      </>
                    ) : (
                      <span className="text-sm font-normal text-gray-400">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fraud Report Notice if reported */}
              {result.data.totalFraudReports > 0 && (
                <div className="p-3 border border-red-300 bg-red-50 text-red-900 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold">
                    Warning: {result.data.totalFraudReports} fraud report(s) flagged for this customer number in courier records.
                  </span>
                </div>
              )}

              {/* Detailed Parcel History Table (Section 3 Requirement) */}
              {result.data.parcels && result.data.parcels.length > 0 && (
                <div className="border border-gray-200 overflow-x-auto">
                  <div className="p-2.5 bg-gray-100 border-b border-gray-200 font-bold text-xs text-gray-800 uppercase tracking-wider">
                    Parcel History Details ({result.data.parcels.length})
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-[11px] font-semibold">
                        <th className="py-2.5 px-3">Consignment ID</th>
                        <th className="py-2.5 px-3">Tracking Code</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Location / Hub</th>
                        <th className="py-2.5 px-3">COD Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.data.parcels.map((parcel, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                            {parcel.consignmentId || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-600">
                            {parcel.trackingLink ? (
                              <a
                                href={parcel.trackingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {parcel.trackingCode || 'Track'}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              parcel.trackingCode || '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {parcel.orderDate || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold border ${
                              /deliver/i.test(parcel.status)
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : /cancel|return/i.test(parcel.status)
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}>
                              {parcel.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {parcel.currentHub || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-900">
                            {parcel.codAmount !== null && parcel.codAmount !== undefined ? `৳${parcel.codAmount}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
