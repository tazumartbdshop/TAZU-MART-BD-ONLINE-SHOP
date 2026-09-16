import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  Plus, 
  ExternalLink, 
  Edit, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search,
  Check,
  ShieldCheck,
  Globe,
  Sliders
} from 'lucide-react';
import { useCourierStore, CourierItem } from '../../../store/useCourierStore';

export default function AdminCourierList() {
  const navigate = useNavigate();
  const { 
    couriers, 
    loading, 
    fetchCouriers, 
    toggleCourierStatus, 
    deleteCourier, 
    testConnection 
  } = useCourierStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  const filteredCouriers = couriers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.apiBaseUrl && c.apiBaseUrl.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleTest = async (id: string) => {
    setTestingId(id);
    const res = await testConnection(id);
    setTestingId(null);
    setTestResults(prev => ({
      ...prev,
      [id]: {
        success: res.success,
        message: res.message || (res.success ? 'API Connected' : 'Connection failed')
      }
    }));
  };

  const handleToggle = async (id: string) => {
    await toggleCourierStatus(id);
  };

  const confirmDelete = async () => {
    if (deleteModalId) {
      await deleteCourier(deleteModalId);
      setDeleteModalId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-gray-800" />
            Courier Listing
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage your integrated courier partners, credentials, and API connectivity.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => fetchCouriers()}
            className="p-2 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/courier/add')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Courier
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search couriers by name or endpoint..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 text-xs sm:text-sm focus:outline-none focus:border-black bg-white"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-600 self-end sm:self-center">
          <div>
            Total: <span className="font-bold text-gray-900">{couriers.length}</span>
          </div>
          <div>
            Active: <span className="font-bold text-emerald-700">{couriers.filter(c => c.status === 'active').length}</span>
          </div>
        </div>
      </div>

      {/* Courier Listing Table */}
      <div className="border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Courier</th>
              <th className="py-3 px-4">API Base URL</th>
              <th className="py-3 px-4">Auth Type</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Connection Test</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCouriers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="font-medium text-gray-700">No couriers found</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Click &quot;Add Courier&quot; above to configure a courier service.</p>
                </td>
              </tr>
            ) : (
              filteredCouriers.map((courier) => {
                const currentTest = testResults[courier.id] || (courier.lastTestStatus ? {
                  success: courier.lastTestStatus === 'connected',
                  message: courier.lastTestMessage || (courier.lastTestStatus === 'connected' ? 'Connected' : 'Failed')
                } : null);

                return (
                  <tr key={courier.id} className="hover:bg-gray-50 transition-colors">
                    {/* Courier Logo & Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                          {courier.logoUrl ? (
                            <img
                              src={courier.logoUrl}
                              alt={courier.name}
                              className="w-full h-full object-contain p-0.5"
                              onError={(e: any) => {
                                e.target.onerror = null;
                                e.target.src = '';
                              }}
                            />
                          ) : (
                            <Truck className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                            {courier.name}
                            {courier.websiteUrl && (
                              <a
                                href={courier.websiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-400 hover:text-black"
                                title="Visit website"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 font-mono">
                            ID: {courier.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* API URL */}
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-600 max-w-xs truncate">
                      {courier.apiBaseUrl || (
                        <span className="text-gray-400 italic">Not configured</span>
                      )}
                    </td>

                    {/* Auth Type */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-medium font-mono uppercase">
                        {courier.authType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(courier.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                          courier.status === 'active'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          courier.status === 'active' ? 'bg-emerald-600' : 'bg-gray-400'
                        }`} />
                        {courier.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Connection Test */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleTest(courier.id)}
                          disabled={testingId === courier.id}
                          className="px-2.5 py-1 border border-gray-300 text-gray-700 hover:bg-gray-100 text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${testingId === courier.id ? 'animate-spin' : ''}`} />
                          {testingId === courier.id ? 'Testing...' : 'Test Connection'}
                        </button>

                        {currentTest && (
                          <div className={`text-[10px] flex items-center gap-1 font-medium ${
                            currentTest.success ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {currentTest.success ? (
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 shrink-0" />
                            )}
                            <span className="truncate max-w-[140px]">{currentTest.message}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/courier/edit/${courier.id}`)}
                          className="p-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Edit Configuration"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteModalId(courier.id)}
                          className="p-1.5 border border-gray-300 text-gray-500 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-colors"
                          title="Delete Courier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 p-5 max-w-sm w-full space-y-4 shadow-lg">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-gray-900 text-sm">Delete Courier Service?</h3>
            </div>
            <p className="text-xs text-gray-600">
              Are you sure you want to remove this courier service configuration? Any associated API credentials will be permanently erased.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalId(null)}
                className="px-3 py-1.5 border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
