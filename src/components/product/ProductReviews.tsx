import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, MessageSquare, Image as ImageIcon, Video, CheckCircle, X, 
  Edit3, SlidersHorizontal, ArrowUpDown, Plus, Play, AlertTriangle, 
  ThumbsUp, Calendar, ArrowUpRight, ChevronRight, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useReviewStore, ProductReview, ReviewSummaryData } from '../../store/useReviewStore';
import { useProductStore } from '../../store/useProductStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { toast } from 'react-hot-toast';

type FilterType = 'All Reviews' | '5 Stars' | '4 Stars' | '3 Stars' | '2 Stars' | '1 Stars' | 'With Photos' | 'Verified Reviews';
type SortType = 'Latest' | 'Highest Rating' | 'Lowest Rating';

interface ProductReviewsProps {
  productId?: string;
  productSlug?: string;
}

export default function ProductReviews({ productId: propProductId, productSlug: propProductSlug }: ProductReviewsProps = {}) {
  const { slug: urlParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Dynamic Stores
  const { reviews, addReview, fetchReviewsForProduct, fetchReviewSummary, toggleLike, isLoading } = useReviewStore();
  const { products } = useProductStore();
  const { user, isAuthenticated } = useAuthStore();
  const { settings } = useSettingsStore();

  // Determine active product
  const product = useMemo(() => {
    if (propProductId) {
      const p = products.find(prod => String(prod.id) === String(propProductId));
      if (p) return p;
    }
    const searchKey = propProductSlug || urlParam;
    if (searchKey) {
      const p = products.find(prod => prod.slug === searchKey || String(prod.id) === String(searchKey));
      if (p) return p;
    }
    return null;
  }, [products, propProductId, propProductSlug, urlParam]);

  const effectiveProductId = propProductId || product?.id || (urlParam && products.find(p => p.slug === urlParam || String(p.id) === String(urlParam))?.id) || urlParam;

  // Local summary and likes state
  const [summaryData, setSummaryData] = useState<ReviewSummaryData | null>(null);
  const [userLikedMap, setUserLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Filter & Sort States
  const [activeFilter, setActiveFilter] = useState<FilterType>('All Reviews');
  const [activeSort, setActiveSort] = useState<SortType>('Latest');

  // Review Form Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  
  // Add Review Form Fields State
  const [rating, setRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<string[]>([]);
  const [anonymousToggle, setAnonymousToggle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessPopupOpen, setIsSuccessPopupOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Image Viewer Modal
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Fetch reviews & summary for the effective product
  useEffect(() => {
    if (!effectiveProductId) return;

    fetchReviewsForProduct(effectiveProductId);

    // Fetch dynamic summary stats
    fetch(`/api/reviews/summary?productId=${effectiveProductId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setSummaryData(data);
      })
      .catch(err => console.error('Failed to load review summary:', err));

    // Get visitor ID for Facebook-style Like persistence
    let visitorId = localStorage.getItem('tm_visitor_id');
    if (!visitorId) {
      visitorId = `v_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      localStorage.setItem('tm_visitor_id', visitorId);
    }

    const effectiveUser = user?.id ? String(user.id) : visitorId;
    fetch(`/api/reviews/likes?userId=${effectiveUser}`)
      .then(res => res.ok ? res.json() : null)
      .then(likes => {
        if (Array.isArray(likes)) {
          const map: Record<string, boolean> = {};
          likes.forEach(id => { map[id] = true; });
          setUserLikedMap(map);
        }
      })
      .catch(console.error);
  }, [effectiveProductId, user?.id]);

  // Product reviews approved list
  const productReviews = useMemo(() => {
    if (!effectiveProductId) return [];
    return reviews.filter(rev => 
      String(rev.productId) === String(effectiveProductId) && 
      (rev.status === 'approved' || !rev.status)
    );
  }, [reviews, effectiveProductId]);

  // Compute live stats synchronized with summary
  const totalReviews = summaryData !== null ? summaryData.total_reviews : productReviews.length;
  const averageRating = summaryData !== null 
    ? summaryData.average_rating 
    : (productReviews.length > 0 
        ? Number((productReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / productReviews.length).toFixed(1))
        : 0);

  // Star breakdown calculation
  const starCounts = useMemo(() => {
    if (summaryData?.rating_breakdown) {
      return {
        5: Number(summaryData.rating_breakdown['5']) || 0,
        4: Number(summaryData.rating_breakdown['4']) || 0,
        3: Number(summaryData.rating_breakdown['3']) || 0,
        2: Number(summaryData.rating_breakdown['2']) || 0,
        1: Number(summaryData.rating_breakdown['1']) || 0,
      };
    }
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    productReviews.forEach(r => {
      const k = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))) as 5|4|3|2|1;
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [summaryData, productReviews]);

  // Customer photos gallery list
  const customerPhotos = useMemo(() => {
    if (summaryData?.customer_photos && summaryData.customer_photos.length > 0) {
      return summaryData.customer_photos;
    }
    const photos: string[] = [];
    productReviews.forEach(r => {
      if (Array.isArray(r.mediaUrls)) {
        r.mediaUrls.forEach(url => {
          if (url && typeof url === 'string' && !url.toLowerCase().endsWith('.mp4')) {
            photos.push(url);
          }
        });
      }
    });
    return photos;
  }, [summaryData, productReviews]);

  // Handle Like click with instant optimistic UI + server sync
  const handleLikeToggle = async (reviewId: string, currentLikes: number) => {
    const isCurrentlyLiked = !!userLikedMap[reviewId];
    const newLiked = !isCurrentlyLiked;
    const baseCount = likesCountMap[reviewId] !== undefined ? likesCountMap[reviewId] : currentLikes;
    const newCount = Math.max(0, baseCount + (newLiked ? 1 : -1));

    // Optimistic update
    setUserLikedMap(prev => ({ ...prev, [reviewId]: newLiked }));
    setLikesCountMap(prev => ({ ...prev, [reviewId]: newCount }));

    try {
      const visitorId = localStorage.getItem('tm_visitor_id') || `v_${Date.now()}`;
      const effectiveUser = user?.id ? String(user.id) : visitorId;

      const res = await fetch(`/api/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUser })
      });

      if (res.ok) {
        const result = await res.json();
        setUserLikedMap(prev => ({ ...prev, [reviewId]: result.isLiked }));
        setLikesCountMap(prev => ({ ...prev, [reviewId]: result.likeCount }));
      }
    } catch (e) {
      console.error('Failed to toggle like:', e);
    }
  };

  // Filter and Sort implementation
  const filteredReviews = useMemo(() => {
    let list = [...productReviews];

    // Star & Media Filters
    if (activeFilter === '5 Stars') {
      list = list.filter(r => Math.round(Number(r.rating)) === 5);
    } else if (activeFilter === '4 Stars') {
      list = list.filter(r => Math.round(Number(r.rating)) === 4);
    } else if (activeFilter === '3 Stars') {
      list = list.filter(r => Math.round(Number(r.rating)) === 3);
    } else if (activeFilter === '2 Stars') {
      list = list.filter(r => Math.round(Number(r.rating)) === 2);
    } else if (activeFilter === '1 Stars') {
      list = list.filter(r => Math.round(Number(r.rating)) === 1);
    } else if (activeFilter === 'With Photos') {
      list = list.filter(r => Array.isArray(r.mediaUrls) && r.mediaUrls.length > 0);
    } else if (activeFilter === 'Verified Reviews') {
      list = list.filter(r => r.verified === true);
    }

    // Sort order
    if (activeSort === 'Highest Rating') {
      list.sort((a, b) => Number(b.rating) - Number(a.rating));
    } else if (activeSort === 'Lowest Rating') {
      list.sort((a, b) => Number(a.rating) - Number(b.rating));
    } else {
      // Latest
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [productReviews, activeFilter, activeSort]);

  // Parse reviewText to extract title & description
  const parseReviewText = (text: string) => {
    if (!text) return { title: '', description: '' };
    const parts = text.split('|||');
    if (parts.length > 1) {
      return { title: parts[0].trim(), description: parts[1].trim() };
    }
    return { title: '', description: text };
  };

  // Write Review Action
  const handleWriteReviewClick = () => {
    if (!isAuthenticated) {
      const currentPath = window.location.pathname;
      const redirectUrl = `${currentPath}?openReview=true`;
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`, { 
        state: { message: 'Please log in to submit your review.' } 
      });
      return;
    }
    if (user) {
      setCustomerName(user.name || '');
    }
    setIsReviewModalOpen(true);
  };

  // Upload helpers
  const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const filesArray = Array.from(files);
    const slotsLeft = 5 - attachedMedia.length;
    if (slotsLeft <= 0) return;
    const filesToLoad = filesArray.slice(0, slotsLeft);

    filesToLoad.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAttachedMedia(prev => prev.length >= 5 ? prev : [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setVideoUrlInput(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setValidationError(null);

    if (!rating || rating < 1 || rating > 5) {
      setValidationError("Please select a star rating (1 to 5).");
      return;
    }
    if (!reviewText.trim()) {
      setValidationError("Please share your feedback description.");
      return;
    }
    if (!anonymousToggle && !customerName.trim()) {
      setValidationError("Full Name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalVideoUrl = videoUrlInput.trim();
      if (finalVideoUrl.startsWith('data:')) {
        try {
          const { uploadImage } = await import('../../lib/imageUtils');
          const res = await fetch(finalVideoUrl);
          const blob = await res.blob();
          finalVideoUrl = await uploadImage(blob as Blob, 'reviews', `video-${Date.now()}`);
        } catch (err) {
          console.error('Failed to upload video:', err);
        }
      }

      const uploadedMediaUrls = await Promise.all(
        attachedMedia.map(async (url) => {
          if (url.startsWith('data:')) {
            try {
              const { uploadImage } = await import('../../lib/imageUtils');
              const res = await fetch(url);
              const blob = await res.blob();
              return await uploadImage(blob as Blob, 'reviews', `image-${Date.now()}`);
            } catch (err) {
              console.error('Failed to upload image:', err);
              return url;
            }
          }
          return url;
        })
      );

      const finalMedia = [...uploadedMediaUrls];
      if (finalVideoUrl) finalMedia.push(finalVideoUrl);

      const finalContent = reviewTitle.trim() ? `${reviewTitle.trim()} ||| ${reviewText.trim()}` : reviewText.trim();
      const targetProdId = effectiveProductId || product?.id || '';

      await addReview({
        productId: targetProdId,
        customerId: user?.id || 'anonymous',
        customerName: anonymousToggle ? 'Anonymous Customer' : customerName.trim(),
        rating,
        reviewText: finalContent,
        mediaUrls: finalMedia,
        status: 'approved',
        verified: true,
        anonymous: anonymousToggle,
        createdAt: new Date().toISOString()
      });

      // Refresh data
      if (targetProdId) {
        fetchReviewsForProduct(targetProdId);
        fetch(`/api/reviews/summary?productId=${targetProdId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => { if (data) setSummaryData(data); });
      }

      setIsSubmitting(false);
      setIsReviewModalOpen(false);
      setIsSuccessPopupOpen(true);

      // Reset form
      setRating(0);
      setReviewTitle('');
      setCustomerName('');
      setReviewText('');
      setAttachedMedia([]);
      setVideoUrlInput('');
      setAnonymousToggle(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setValidationError(err.message || "An unexpected database error occurred.");
    }
  };

  return (
    <section className="bg-white border-t border-zinc-200 font-sans" id="reviews-section">
      <div className="container mx-auto px-4 lg:px-8 max-w-7xl py-12 md:py-16">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10 border-b border-zinc-100 pb-8">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-zinc-950">Ratings & Reviews</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-zinc-950 text-white px-3 py-1 font-black uppercase tracking-widest rounded-none">
                {settings.storeName ? `${settings.storeName.trim().toUpperCase()} QUALITY VERIFIED` : 'IYABD QUALITY VERIFIED'}
              </span>
              <span className="text-xs font-semibold text-zinc-500">
                ({totalReviews} {totalReviews === 1 ? 'Customer Review' : 'Customer Reviews'})
              </span>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={handleWriteReviewClick}
            className="group flex items-center justify-center gap-2 bg-zinc-950 text-white hover:bg-zinc-800 px-7 py-3.5 rounded-none text-xs font-black uppercase tracking-widest transition-all shadow-md active:translate-y-0.5 border border-black shrink-0"
          >
            <span>✏️</span> WRITE A REVIEW
          </button>
        </div>

        {/* OVERALL RATING & STAR BREAKDOWN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12 bg-zinc-50/60 p-6 md:p-8 border border-zinc-200 rounded-2xl shadow-sm">
          
          {/* Left Column: Overall Average Rating */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center text-center lg:border-r border-zinc-200 lg:pr-8 py-2">
            <span className="text-6xl font-black text-zinc-950 tracking-tighter leading-none mb-2">
              {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
            </span>
            
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star 
                  key={s} 
                  className={`w-5 h-5 ${
                    s <= Math.round(averageRating) 
                      ? 'fill-amber-500 text-amber-500' 
                      : 'fill-zinc-200 text-zinc-200 border-none'
                  }`} 
                />
              ))}
            </div>

            <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">
              Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </p>
            {summaryData?.total_verified_reviews ? (
              <p className="text-[10px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {summaryData.total_verified_reviews} Verified Purchases
              </p>
            ) : null}
          </div>

          {/* Middle Column: Clickable Star Breakdown rows */}
          <div className="lg:col-span-5 space-y-1.5 py-1">
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Rating Breakdown</span>
              <span className="text-[10px] text-zinc-400 font-normal">Click a row to filter</span>
            </div>

            {[5, 4, 3, 2, 1].map((stars) => {
              const count = starCounts[stars as 5 | 4 | 3 | 2 | 1];
              const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              const isSelected = activeFilter === `${stars} Stars`;

              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setActiveFilter(isSelected ? 'All Reviews' : (`${stars} Stars` as FilterType))}
                  className={`w-full flex items-center gap-3 text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-all text-left group ${
                    isSelected ? 'bg-amber-500/10 ring-1 ring-amber-500 font-bold' : 'hover:bg-zinc-200/60'
                  }`}
                >
                  <span className={`w-14 font-bold whitespace-nowrap flex items-center gap-1 ${isSelected ? 'text-amber-800' : 'text-zinc-700'}`}>
                    <span>{stars} Stars</span>
                  </span>
                  
                  <div className="flex-1 h-2.5 bg-zinc-200 rounded-full overflow-hidden relative">
                    <div 
                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${isSelected ? 'bg-amber-600' : 'bg-amber-500 group-hover:bg-amber-600'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  
                  <span className="w-10 text-right text-zinc-600 font-bold text-xs">{percent}%</span>
                  <span className="w-8 text-right text-zinc-400 text-[11px] font-semibold">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Customer Gallery Preview */}
          <div className="lg:col-span-3 py-2 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-zinc-800 tracking-wider">
                Customer Gallery ({customerPhotos.length})
              </h4>
              {customerPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('With Photos')}
                  className="text-[10px] font-bold text-zinc-500 hover:text-zinc-950 uppercase underline"
                >
                  View All
                </button>
              )}
            </div>

            {customerPhotos.length === 0 ? (
              <div className="p-4 bg-white border border-dashed border-zinc-200 rounded-xl text-center">
                <ImageIcon className="w-6 h-6 text-zinc-300 mx-auto mb-1" />
                <p className="text-[11px] text-zinc-400 font-medium">No customer photos uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {customerPhotos.slice(0, 8).map((img, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => setViewingImage(img)}
                    className="aspect-square bg-zinc-100 rounded-lg border border-zinc-200 overflow-hidden relative group"
                  >
                    <img 
                      src={img} 
                      alt={`Customer photo ${idx + 1}`} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                      referrerPolicy="no-referrer"
                    />
                    {idx === 7 && customerPhotos.length > 8 && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-white text-[10px] font-black">
                        +{customerPhotos.length - 8}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* REVIEW FILTERS & SORTING BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5 mb-8">
          
          {/* Filters pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0 mr-1" />
            
            {([
              'All Reviews', '5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Stars', 'With Photos', 'Verified Reviews'
            ] as FilterType[]).map((filter) => {
              const count = filter === 'All Reviews' ? totalReviews :
                filter === '5 Stars' ? starCounts[5] :
                filter === '4 Stars' ? starCounts[4] :
                filter === '3 Stars' ? starCounts[3] :
                filter === '2 Stars' ? starCounts[2] :
                filter === '1 Stars' ? starCounts[1] :
                filter === 'With Photos' ? customerPhotos.length :
                filter === 'Verified Reviews' ? (summaryData?.total_verified_reviews || 0) : 0;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all border ${
                    activeFilter === filter 
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  {filter} {count > 0 && <span className="opacity-70 ml-1">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value as SortType)}
                aria-label="Sort reviews"
                className="bg-transparent font-bold text-zinc-900 border-none outline-none cursor-pointer text-xs"
              >
                <option value="Latest">Latest First</option>
                <option value="Highest Rating">Highest Rating</option>
                <option value="Lowest Rating">Lowest Rating</option>
              </select>
            </div>

            <div className="text-xs text-zinc-400 font-bold">
              Showing <span className="text-zinc-900">{filteredReviews.length}</span> of {totalReviews}
            </div>
          </div>
        </div>

        {/* FACEBOOK-STYLE REVIEW CARDS LIST */}
        <div className="space-y-6">
          {filteredReviews.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-zinc-50 rounded-2xl border border-zinc-200">
               <MessageSquare className="w-12 h-12 text-zinc-300 mb-3" />
               <p className="text-zinc-700 font-bold text-sm">No reviews matching "{activeFilter}".</p>
               <p className="text-xs text-zinc-400 mt-1">Try selecting another filter or be the first to review this product!</p>
               {activeFilter !== 'All Reviews' && (
                 <button
                   type="button"
                   onClick={() => setActiveFilter('All Reviews')}
                   className="mt-4 px-4 py-2 bg-zinc-950 text-white text-xs font-bold uppercase tracking-wider rounded-lg"
                 >
                   Show All Reviews
                 </button>
               )}
            </div>
          ) : (
            filteredReviews.slice(0, visibleCount).map((review) => {
              const displayName = review.anonymous ? 'Anonymous Customer' : (review.customerName || 'Verified Buyer');
              const initials = displayName ? displayName.substring(0, 2).toUpperCase() : 'VB';
              const { title, description } = parseReviewText(review.reviewText);

              const isLiked = !!userLikedMap[review.reviewId];
              const effectiveLikes = likesCountMap[review.reviewId] !== undefined 
                ? likesCountMap[review.reviewId] 
                : (review.likesCount || 0);

              return (
                <motion.article 
                  key={review.reviewId} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-5 md:p-6 rounded-2xl border border-zinc-200 shadow-sm relative flex flex-col gap-4 hover:border-zinc-300 transition-all"
                >
                  {/* Pinned Badge */}
                  {review.isPinned && (
                    <div className="absolute top-5 right-5 text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 select-none">
                      📌 Pinned Review
                    </div>
                  )}

                  {/* HEADER ROW - Facebook-Style Profile Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-zinc-800 to-zinc-950 text-white rounded-full flex items-center justify-center text-xs font-black tracking-widest shrink-0 shadow-inner">
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-zinc-950 truncate">
                          {displayName}
                        </h4>
                        
                        {review.verified && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified Purchase
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 font-medium">
                        {/* Rating stars */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star 
                              key={s} 
                              className={`w-3.5 h-3.5 ${
                                s <= Number(review.rating) 
                                  ? 'fill-amber-500 text-amber-500' 
                                  : 'fill-zinc-200 text-zinc-200 border-none'
                              }`} 
                            />
                          ))}
                        </div>
                        <span>•</span>
                        <time className="text-[11px] text-zinc-400 font-semibold">
                          {new Date(review.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </time>
                      </div>
                    </div>
                  </div>

                  {/* BODY SECTOR */}
                  <div className="space-y-2.5 pl-1">
                    {title && (
                      <h5 className="text-sm font-black text-zinc-950 leading-snug">
                        {title}
                      </h5>
                    )}
                    
                    <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                      {description}
                    </p>

                    {/* Customer Media Attachments */}
                    {review.mediaUrls && review.mediaUrls.length > 0 && (
                      <div className="pt-2">
                        {review.mediaUrls.length === 1 ? (
                          <div className="max-w-md rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50 max-h-96">
                            {review.mediaUrls[0].toLowerCase().endsWith('.mp4') ? (
                              <video src={review.mediaUrls[0]} controls className="w-full h-full object-contain" />
                            ) : (
                              <img 
                                src={review.mediaUrls[0]} 
                                alt="Customer review photo" 
                                className="w-full h-full object-contain cursor-pointer hover:opacity-95 transition-opacity" 
                                referrerPolicy="no-referrer"
                                onClick={() => setViewingImage(review.mediaUrls[0])}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-2xl">
                            {review.mediaUrls.map((url, idx) => {
                              const isVideo = url.toLowerCase().endsWith('.mp4');
                              return (
                                <div 
                                  key={idx} 
                                  className="aspect-square relative bg-zinc-100 border border-zinc-200 rounded-xl overflow-hidden group cursor-pointer"
                                  onClick={() => !isVideo && setViewingImage(url)}
                                >
                                  {isVideo ? (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-white">
                                      <Video className="w-6 h-6 text-zinc-400" />
                                      <span className="absolute bottom-1 right-1 text-[7px] font-black bg-black/80 px-1 rounded uppercase">Video</span>
                                    </div>
                                  ) : (
                                    <img 
                                      src={url} 
                                      alt={`Attachment ${idx + 1}`} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Official Brand Reply */}
                    {review.adminReply && (
                      <div className="mt-4 p-4 bg-zinc-50 text-zinc-900 border border-zinc-200 rounded-xl">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 mb-1.5">
                          <span className="w-4 h-4 bg-zinc-950 text-white rounded-full flex items-center justify-center text-[8px] font-black">I</span>
                          <span>IYABD Official Response</span>
                        </div>
                        <p className="text-xs text-zinc-700 leading-relaxed">{review.adminReply}</p>
                      </div>
                    )}
                  </div>

                  {/* FOOTER ROW - Facebook-Style Like Button */}
                  <div className="border-t border-zinc-100 pt-3 flex items-center justify-between">
                    <button 
                      type="button"
                      onClick={() => handleLikeToggle(review.reviewId, review.likesCount || 0)}
                      className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        isLiked 
                          ? 'text-blue-600 bg-blue-50 border border-blue-200' 
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 border border-transparent'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-blue-600' : ''}`} />
                      <span>{isLiked ? 'Liked' : 'Like'}</span>
                      {effectiveLikes > 0 && (
                        <span className={`text-[11px] font-black ml-0.5 ${isLiked ? 'text-blue-600' : 'text-zinc-500'}`}>
                          ({effectiveLikes})
                        </span>
                      )}
                    </button>
                    
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Authentic Review
                    </span>
                  </div>
                </motion.article>
              );
            })
          )}
        </div>

        {/* Load More Reviews Button */}
        {filteredReviews.length > visibleCount && (
          <div className="mt-10 flex justify-center">
            <button 
              type="button"
              onClick={() => setVisibleCount(prev => prev + 6)}
              className="px-8 py-3.5 bg-white border border-zinc-300 text-zinc-950 text-xs font-bold uppercase tracking-widest hover:border-zinc-950 hover:bg-zinc-50 transition-all rounded-none flex items-center gap-2 shadow-sm"
            >
              Load More Reviews ({filteredReviews.length - visibleCount} remaining)
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Write a Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 my-8"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-zinc-950">Write A Review</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Share your authentic experience with this product</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-950 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
                {validationError && (
                  <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Rating Select */}
                <div>
                  <label className="block text-xs font-black uppercase text-zinc-700 tracking-wider mb-2">
                    Overall Rating *
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star 
                          className={`w-7 h-7 ${
                            star <= (hoveredStar || rating)
                              ? 'fill-amber-500 text-amber-500' 
                              : 'fill-zinc-100 text-zinc-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-zinc-500 ml-2">
                      {rating > 0 ? `${rating} of 5 Stars` : 'Click to rate'}
                    </span>
                  </div>
                </div>

                {/* Name */}
                {!anonymousToggle && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-700 tracking-wider mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed"
                      className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
                    />
                  </div>
                )}

                {/* Anonymous checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anon"
                    checked={anonymousToggle}
                    onChange={(e) => setAnonymousToggle(e.target.checked)}
                    className="rounded text-zinc-950 focus:ring-0"
                  />
                  <label htmlFor="anon" className="text-xs font-semibold text-zinc-600 cursor-pointer select-none">
                    Submit review anonymously
                  </label>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-700 tracking-wider mb-1">
                    Review Headline
                  </label>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="e.g. Excellent build quality and fast delivery!"
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950"
                  />
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-700 tracking-wider mb-1">
                    Detailed Review *
                  </label>
                  <textarea
                    rows={4}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Describe what you liked or disliked about this product..."
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-950 resize-none"
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-700 tracking-wider mb-1">
                    Add Photos (Optional, max 5)
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {attachedMedia.map((img, idx) => (
                      <div key={idx} className="w-14 h-14 relative rounded-lg border border-zinc-200 overflow-hidden">
                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAttachedMedia(attachedMedia.filter((_, i) => i !== idx))}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {attachedMedia.length < 5 && (
                      <label className="w-14 h-14 border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-zinc-400 transition-colors">
                        <Plus className="w-4 h-4 text-zinc-400" />
                        <span className="text-[8px] font-bold text-zinc-400">Photo</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageUploadChange} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-zinc-950 text-white text-xs font-black uppercase tracking-widest rounded-none hover:bg-zinc-800 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting Review...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Popup Modal */}
      <AnimatePresence>
        {isSuccessPopupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white max-w-sm w-full p-6 rounded-2xl text-center space-y-4 border border-zinc-200 shadow-2xl"
            >
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-zinc-950">Thank You!</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Your review has been successfully submitted and verified. It is now published in the storefront ratings.
              </p>
              <button
                type="button"
                onClick={() => setIsSuccessPopupOpen(false)}
                className="w-full py-3 bg-zinc-950 text-white text-xs font-black uppercase tracking-widest rounded-none hover:bg-zinc-800 transition-all"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {viewingImage && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={() => setViewingImage(null)}
          >
            <div className="relative max-w-3xl max-h-[85vh]">
              <img 
                src={viewingImage} 
                alt="Enlarged review attachment" 
                className="w-full h-full object-contain rounded-xl max-h-[85vh]"
                referrerPolicy="no-referrer" 
              />
              <button
                type="button"
                onClick={() => setViewingImage(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
