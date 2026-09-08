import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, ArrowRight, Check, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { campaignService, Campaign, Coupon } from '../../services/campaignService';
import toast from 'react-hot-toast';

// Module-level guard: ensures that once the offer queue completes during a page load,
// it never restarts during client-side navigation until the user reloads the page.
let hasCompletedQueueInThisLoad = false;

const SESSION_SKIP_KEY = 'iyabd_offers_session_skipped';

export function StorefrontPopup() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<(Campaign & { products: string[], categories: string[], coupon?: Coupon })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3);
  const activeIndexRef = useRef(0);

  // Keep activeIndexRef in sync
  useEffect(() => {
    activeIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Initial load effect
  useEffect(() => {
    // If the user previously clicked 'Skip' in this session, do not show
    if (sessionStorage.getItem(SESSION_SKIP_KEY) === 'true') {
      return;
    }

    // If the offer queue was already completed in this page load, do not show until page reload
    if (hasCompletedQueueInThisLoad) {
      return;
    }

    // Clean up old legacy keys if present
    sessionStorage.removeItem('iyabd_campaigns_seen');

    let isMounted = true;
    campaignService.getActiveCampaigns()
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setCampaigns(data);
          setCurrentIndex(0);
          setTimeLeft(3);
          setIsOpen(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load campaigns for popup:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Strict 3-second countdown per offer in the queue
  // Guaranteed single interval, strictly 3 -> 2 -> 1 -> Auto Next/Close
  useEffect(() => {
    if (!isOpen || campaigns.length === 0) return;

    if (currentIndex >= campaigns.length) {
      hasCompletedQueueInThisLoad = true;
      setIsOpen(false);
      return;
    }

    // Initialize countdown to strictly 3 seconds
    setTimeLeft(3);
    let secondsRemaining = 3;

    const intervalId = setInterval(() => {
      secondsRemaining -= 1;
      if (secondsRemaining > 0) {
        setTimeLeft(secondsRemaining);
      } else {
        // 3 seconds finished!
        clearInterval(intervalId);
        setTimeLeft(0);

        // Transition to next offer in queue or finish
        if (activeIndexRef.current < campaigns.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          // All offers finished!
          hasCompletedQueueInThisLoad = true;
          setIsOpen(false);
        }
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isOpen, currentIndex, campaigns.length]);

  // Handle Skip Button Click
  // Stops all popups immediately, cancels remaining offers, and ensures no popup in this session
  const handleSkipAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    hasCompletedQueueInThisLoad = true;
    sessionStorage.setItem(SESSION_SKIP_KEY, 'true');
    setIsOpen(false);
  };

  // Handle View Offer Click
  const handleView = () => {
    const activeCampaign = campaigns[currentIndex];
    if (!activeCampaign) return;

    // Mark as completed/closed so it doesn't pop up again
    hasCompletedQueueInThisLoad = true;
    sessionStorage.setItem(SESSION_SKIP_KEY, 'true');
    setIsOpen(false);

    const productId = activeCampaign.products?.[0] || activeCampaign.productIds?.[0];
    if (productId) {
      navigate(`/product/${productId}`);
    } else {
      navigate(`/campaign/${activeCampaign.id}`);
    }
  };

  const handleCopyCoupon = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Coupon Code Copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeCampaign = campaigns[currentIndex];
  if (!isOpen || !activeCampaign) return null;

  const fallbackImage = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          id="iyabd-offer-popup-backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkipAll}
        >
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeCampaign.id || currentIndex}
              id={`offer-card-${currentIndex + 1}`}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative border border-slate-100"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: -16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Offer Queue Step Progress Indicator */}
              {campaigns.length > 1 && (
                <div className="bg-slate-900/90 text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-amber-400">
                    <Tag className="w-3 h-3" />
                    Special Offer {currentIndex + 1} of {campaigns.length}
                  </span>
                  <div className="flex items-center gap-1">
                    {campaigns.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentIndex
                            ? 'w-4 bg-amber-400'
                            : idx < currentIndex
                            ? 'w-1.5 bg-slate-400'
                            : 'w-1.5 bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Offer Banner Image */}
              <div className="relative aspect-[3/2] w-full bg-slate-100 overflow-hidden">
                <img 
                  src={activeCampaign.image_url || fallbackImage} 
                  alt={activeCampaign.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbackImage;
                  }}
                />
              </div>
              
              {/* Offer Content */}
              <div className="p-5 flex flex-col items-center text-center space-y-3.5">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 leading-snug">
                  {activeCampaign.title}
                </h3>
                
                {activeCampaign.description && (
                  <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xs mx-auto line-clamp-2 leading-relaxed">
                    {activeCampaign.description}
                  </p>
                )}
                
                {/* Coupon Code Section */}
                {activeCampaign.coupon && activeCampaign.coupon.active && (
                  <div className="w-full bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex flex-col items-start pl-1">
                      <span className="text-[10px] uppercase font-black tracking-wider text-amber-700">Coupon Code</span>
                      <span className="font-mono font-black text-amber-950 text-sm tracking-wide">{activeCampaign.coupon.code}</span>
                    </div>
                    <button 
                      id="btn-copy-offer-coupon"
                      type="button"
                      onClick={(e) => handleCopyCoupon(e, activeCampaign.coupon!.code)}
                      className="h-8 px-3 bg-amber-200/70 hover:bg-amber-300 active:bg-amber-400 text-amber-900 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                
                {/* Action Buttons: Skip (3s) & View Offer */}
                <div className="w-full flex gap-2.5 pt-1">
                  <button 
                    id="btn-skip-offer"
                    type="button"
                    onClick={handleSkipAll}
                    className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
                    title="Skip all offers and close popup"
                  >
                    Skip ({timeLeft > 0 ? timeLeft : 1}s)
                  </button>
                  <button 
                    id="btn-view-offer"
                    type="button"
                    onClick={handleView}
                    className="flex-[2] h-11 bg-slate-950 hover:bg-black text-white rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md hover:shadow-lg cursor-pointer"
                  >
                    View Offer
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default StorefrontPopup;
