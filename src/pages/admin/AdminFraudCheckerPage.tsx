import React, { useState } from 'react';
import { ShieldAlert, Truck, Info, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { FraudCheckerBar } from '../../components/admin/FraudCheckerBar';
import { useNavigate } from 'react-router-dom';
import { useCourierStore } from '../../store/useCourierStore';

export default function AdminFraudCheckerPage() {
  const navigate = useNavigate();
  const { couriers } = useCourierStore();
  const activeCouriers = couriers.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-gray-900" />
            Fraud Checker
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Real courier-based customer order history & delivery success verification system.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/courier/list')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Truck className="w-4 h-4" />
            Manage Couriers ({activeCouriers.length} Active)
          </button>
        </div>
      </div>

      {/* Primary Fraud Checker Bar */}
      <FraudCheckerBar />

      {/* Information & Security Rules Note */}
      <div className="border border-gray-200 bg-white p-4">
        <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-600" />
          Real-Time Courier Verification Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600 pt-1">
          <div className="border border-gray-100 p-3 bg-gray-50">
            <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Real Live Data
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              Every search hits the selected courier&apos;s live API. No synthetic data, no dummy orders, and no fake fraud scores.
            </p>
          </div>

          <div className="border border-gray-100 p-3 bg-gray-50">
            <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              Multi-Courier Support
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              Seamlessly switch between Steadfast, Pathao, RedX or any custom connected courier from the dynamic dropdown.
            </p>
          </div>

          <div className="border border-gray-100 p-3 bg-gray-50">
            <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-gray-800" />
              Secure API Gateway
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              All API keys, secret keys, and bearer tokens are proxied server-side and never exposed to the frontend browser bundle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
