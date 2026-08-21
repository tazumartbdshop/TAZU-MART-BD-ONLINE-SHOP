import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X } from 'lucide-react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const savedConsent = localStorage.getItem('user_consent');
    if (!savedConsent) {
      setIsVisible(true);
    } else {
      try {
        const consent = JSON.parse(savedConsent);
        if (window.gtag) {
          window.gtag('consent', 'update', {
            'ad_storage': consent.ad_storage ? 'granted' : 'denied',
            'ad_user_data': consent.ad_user_data ? 'granted' : 'denied',
            'ad_personalization': consent.ad_personalization ? 'granted' : 'denied',
            'analytics_storage': consent.analytics_storage ? 'granted' : 'denied'
          });
        }
      } catch (e) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const consent = {
      ad_storage: true,
      ad_user_data: true,
      ad_personalization: true,
      analytics_storage: true
    };
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted',
        'analytics_storage': 'granted'
      });
    }
    localStorage.setItem('user_consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  const handleDecline = () => {
    const consent = {
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false,
      analytics_storage: false
    };
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'analytics_storage': 'denied'
      });
    }
    localStorage.setItem('user_consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div id="cookie-consent-banner" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-slate-900/95 text-white p-5 rounded-2xl shadow-2xl backdrop-blur-md z-[9999] border border-slate-800 transition-all duration-300">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-base">
          <Cookie className="w-5 h-5" />
          <span>Cookie & Privacy Consent (v2)</span>
        </div>
        <button
          onClick={handleDecline}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-slate-300 text-xs leading-relaxed mb-4">
        We use cookies and analytical tracking (Google Consent Mode v2) to enhance your shopping experience on TAZU MART BD, analyze site performance, and serve personalized offers.
      </p>

      <div className="flex items-center gap-2 text-xs">
        <button
          id="btn-accept-consent"
          onClick={handleAcceptAll}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2 px-3 rounded-xl transition-all shadow-md active:scale-95 text-center"
        >
          Accept All
        </button>
        <button
          id="btn-decline-consent"
          onClick={handleDecline}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium py-2 px-3 rounded-xl transition-all border border-slate-700 text-center"
        >
          Decline Non-Essential
        </button>
      </div>
    </div>
  );
};
