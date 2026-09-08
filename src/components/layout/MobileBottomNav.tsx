import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, Percent, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../../store/useLanguageStore';
import { useState, useEffect } from 'react';
import { campaignService } from '../../services/campaignService';

// Synchronous cached campaign loader to avoid any initial delay or icon flash
const getInitialActiveCampaigns = (): any[] => {
  return campaignService.getCachedActiveCampaigns();
};

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>(getInitialActiveCampaigns);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const [offerImageError, setOfferImageError] = useState(false);

  useEffect(() => {
    campaignService.getActiveCampaigns()
      .then(data => {
        if (data && data.length > 0) {
          setActiveCampaigns(data);
          try {
            localStorage.setItem('tazu_cached_active_campaigns', JSON.stringify(data));
          } catch (e) {
            // ignore
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeCampaigns.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % activeCampaigns.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeCampaigns.length]);

  const navItems = [
    { name: t.home, icon: Home, path: '/' },
    { name: t.categories, icon: LayoutGrid, path: '/categories' },
    { name: t.offers, icon: Percent, path: '/offers', isOffer: true },
    { name: t.support, icon: MessageSquare, path: '/support' },
    { name: t.account, icon: User, path: '/account/dashboard', isAccount: true },
  ];

  if (location.pathname.startsWith('/product/') || location.pathname === '/checkout') return null;

  const currentCampaign = activeCampaigns[currentPromoIndex] || activeCampaigns[0];
  const offerImgSrc = (!offerImageError && currentCampaign?.image_url) ? currentCampaign.image_url : '/offer.png';

  return (
    <div 
      className="fixed bottom-0 left-0 w-full z-50 bg-bg-primary/95 backdrop-blur-md text-text-primary border-t border-border-theme shadow-[0_-4px_16px_rgba(0,0,0,0.04)] transition-colors duration-200"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex justify-around items-center h-[58px] max-w-lg mx-auto px-2 relative">
        {navItems.map((item) => {
          const path = item.isAccount ? '/account/dashboard' : item.path;
          const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={path}
              title={item.name}
              aria-label={item.name}
              onMouseEnter={() => {
                if (item.isOffer) campaignService.preloadActiveCampaigns();
              }}
              onTouchStart={() => {
                if (item.isOffer) campaignService.preloadActiveCampaigns();
              }}
              className="flex-1 h-full flex flex-col items-center justify-center relative select-none group"
            >
              <motion.div 
                whileTap={{ scale: 0.88 }}
                className="relative w-12 h-10 flex flex-col items-center justify-center"
              >
                {/* Modern Rounded Square / Soft Rectangle Active Indicator (No Circle) */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active-pill"
                    className="absolute inset-0 rounded-xl shadow-xs"
                    style={{
                      backgroundColor: 'var(--home-active-bg, #000000)',
                    }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}

                {/* Active Indicator Underneath */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator-bar"
                    className="absolute -bottom-1.5 w-3.5 h-[3px] bg-amber-500 rounded-full shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}

                <div 
                  className="relative z-10 flex items-center justify-center transition-colors duration-200"
                  style={{
                    color: isActive ? 'var(--home-active-text, #ffffff)' : '#9CA3AF',
                  }}
                >
                  {item.isOffer ? (
                    <div className="relative flex items-center justify-center">
                      {!offerImageError ? (
                        <div className="relative w-8 h-8 sm:w-8.5 sm:h-8.5 aspect-square rounded-lg overflow-hidden flex items-center justify-center">
                          <img
                            key={currentCampaign?.id || 'current-offer'}
                            src={offerImgSrc}
                            alt={currentCampaign?.title || 'Offer'}
                            loading="eager"
                            decoding="sync"
                            // @ts-ignore
                            fetchPriority="high"
                            onError={(e) => {
                              if ((e.target as HTMLImageElement).src !== window.location.origin + '/offer.png') {
                                (e.target as HTMLImageElement).src = '/offer.png';
                              } else {
                                setOfferImageError(true);
                              }
                            }}
                            className="w-full h-full object-contain select-none transition-transform duration-200 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} className="text-red-500" />
                      )}

                      {activeCampaigns.length > 0 && (
                        <span className="absolute -top-1 -right-1.5 bg-red-600 text-white text-[7px] font-black px-1 py-0.2 rounded-full uppercase tracking-tighter shadow-sm z-10">
                          {activeCampaigns.length}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                  )}
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Rotating campaign badge / promo banner popup indicator above offers button if campaigns exist */}
      {currentCampaign && location.pathname !== '/offers' && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCampaign.id || currentPromoIndex}
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="bg-black text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg border border-neutral-800 flex items-center gap-1.5 pointer-events-auto cursor-pointer"
              onClick={() => navigate('/offers')}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="truncate max-w-[180px]">{currentCampaign.title}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
