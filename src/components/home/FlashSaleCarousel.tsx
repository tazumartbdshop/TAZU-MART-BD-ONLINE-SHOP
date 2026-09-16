import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CompactProductCard } from '../product/CompactProductCard';

// Import Swiper styles
import 'swiper/css';

interface FlashSaleCarouselProps {
  products: any[];
  autoSlideInterval?: number; // default: 3500ms
  resumeDelay?: number;       // default: 5000ms (5 seconds wait after user interaction ends)
}

export default function FlashSaleCarousel({
  products,
  autoSlideInterval = 3500,
  resumeDelay = 5000
}: FlashSaleCarouselProps) {
  const swiperRef = useRef<SwiperClass | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInteractingRef = useRef<boolean>(false);
  const [canSlide, setCanSlide] = useState(false);

  // Clear any existing resume timer (resets the 5s timer)
  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  // Immediate pause when user touches, holds, hovers, or drags
  const handleInteractionStart = () => {
    isInteractingRef.current = true;
    clearResumeTimer(); // reset timer on any new touch / interaction
    if (swiperRef.current && swiperRef.current.autoplay) {
      swiperRef.current.autoplay.stop();
    }
  };

  // Wait 5 seconds after customer finishes touch/swipe/hover before resuming auto-scroll
  const handleInteractionEnd = () => {
    isInteractingRef.current = false;
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      if (!isInteractingRef.current && swiperRef.current && swiperRef.current.autoplay) {
        swiperRef.current.autoplay.start();
      }
    }, resumeDelay);
  };

  // Navigation button handlers with touch/interaction pause
  const handlePrev = () => {
    handleInteractionStart();
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
    }
    handleInteractionEnd();
  };

  const handleNext = () => {
    handleInteractionStart();
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
    handleInteractionEnd();
  };

  // Clean up all timers on unmount to prevent memory leaks or background timers
  useEffect(() => {
    return () => {
      clearResumeTimer();
    };
  }, []);

  // Ensure enough items in the track for seamless continuous looping when looping 2 items per view
  const displayProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (products.length === 1) {
      return [
        { ...products[0], _key: `${products[0].id || 0}-a` },
        { ...products[0], _key: `${products[0].id || 0}-b` },
        { ...products[0], _key: `${products[0].id || 0}-c` },
        { ...products[0], _key: `${products[0].id || 0}-d` }
      ];
    }
    if (products.length < 6) {
      const factor = Math.ceil(6 / products.length);
      const list: any[] = [];
      for (let i = 0; i < factor; i++) {
        products.forEach((p, idx) => {
          list.push({ ...p, _key: `${p.id || idx}-rep-${i}` });
        });
      }
      return list;
    }
    return products.map((p, idx) => ({ ...p, _key: `${p.id || idx}` }));
  }, [products]);

  if (!products || products.length === 0) {
    return null;
  }

  const isMultiProduct = displayProducts.length > 2;

  return (
    <div 
      className="w-full relative select-none group/fs"
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
      onTouchCancel={handleInteractionEnd}
    >
      {/* Centered responsive container ensuring 2 cards visible with their native compact size */}
      <div className="w-full max-w-full sm:max-w-[460px] md:max-w-[500px] mx-auto relative px-0 sm:px-2">
        <Swiper
          modules={[Autoplay]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            setCanSlide(displayProducts.length > 2);
          }}
          // Strictly 2 product cards visible side-by-side
          slidesPerView={2}
          slidesPerGroup={1}
          spaceBetween={8} // 8px matching standard mobile 2-col gap (gap-2)
          loop={isMultiProduct}
          speed={800} // Smooth, gradual slide transition
          autoplay={
            isMultiProduct
              ? {
                  delay: autoSlideInterval,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: false // Managed manually for precise 5s resume
                }
              : false
          }
          grabCursor={true}
          simulateTouch={true}
          touchRatio={1}
          touchAngle={45} // Permits vertical scrolling while smoothly capturing horizontal swipes
          nested={false}
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          onSliderMove={handleInteractionStart}
          className="flash-sale-swiper !overflow-hidden rounded-[6px]"
        >
          {displayProducts.map((prod) => (
            <SwiperSlide key={prod._key} className="!h-auto">
              <div className="w-full h-full pb-0.5">
                <CompactProductCard 
                  product={{
                    ...prod,
                    imageUrl: prod.imageUrl || prod.image || null
                  }} 
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Optional Desktop Manual Navigation Arrows */}
        {canSlide && (
          <>
            <button
              type="button"
              aria-label="Previous Product"
              onClick={handlePrev}
              className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-white/95 hover:bg-white text-gray-700 hover:text-black rounded-full shadow-md border border-gray-200 items-center justify-center transition-all opacity-0 group-hover/fs:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next Product"
              onClick={handleNext}
              className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-white/95 hover:bg-white text-gray-700 hover:text-black rounded-full shadow-md border border-gray-200 items-center justify-center transition-all opacity-0 group-hover/fs:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
