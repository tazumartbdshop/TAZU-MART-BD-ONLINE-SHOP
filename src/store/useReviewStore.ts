import { create } from 'zustand';
import { db } from '../lib/db';
import { toast } from 'react-hot-toast';

export interface ProductReview {
  reviewId: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number; // 1 to 5
  reviewText: string;
  mediaUrls: string[]; // JPG, PNG, WEBP, MP4
  adminReply?: string;
  status: 'pending' | 'approved' | 'hidden' | 'rejected';
  verified: boolean;
  createdAt: string; // ISO String
  
  // Extra detailed metadata requested
  phone?: string;
  email?: string;
  orderId?: string;
  deviceIP?: string;
  anonymous?: boolean;
  isPinned?: boolean;
  rejectionReason?: string;
  likesCount?: number;
  userLiked?: boolean;
}

export interface ReviewSummaryData {
  product_id: string;
  average_rating: number;
  total_reviews: number;
  total_verified_reviews: number;
  rating_breakdown: Record<string, number>;
  customer_photos_count?: number;
  customer_photos?: string[];
}

export interface ReviewNotification {
  id: string;
  message: string;
  type: 'info' | 'alert';
  createdAt: string;
  read: boolean;
}

interface ReviewState {
  reviews: ProductReview[];
  reviewSummary: ReviewSummaryData | null;
  notifications: ReviewNotification[];
  isLoading: boolean;
  
  // Actions
  fetchReviews: (silent?: boolean) => Promise<void>;
  fetchReviewsForProduct: (productId: string) => Promise<void>;
  fetchReviewSummary: (productId: string) => Promise<ReviewSummaryData | null>;
  toggleLike: (reviewId: string, userId?: string) => Promise<{ likeCount: number; isLiked: boolean } | null>;
  recalculateProductStats: (productId: string) => Promise<void>;
  addReview: (review: Omit<ProductReview, 'reviewId' | 'createdAt' | 'status'> & { status?: 'pending' | 'approved' | 'hidden' | 'rejected', createdAt?: string }) => Promise<void>;
  updateReview: (reviewId: string, updates: Partial<Omit<ProductReview, 'reviewId' | 'productId' | 'customerId' | 'createdAt'>>) => Promise<void>;
  approveReview: (reviewId: string) => Promise<void>;
  hideReview: (reviewId: string) => Promise<void>;
  rejectReview: (reviewId: string, reason?: string) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  pinReview: (reviewId: string) => Promise<void>;
  markVerifiedPurchase: (reviewId: string, verified: boolean) => Promise<void>;
  replyToReview: (reviewId: string, reply: string) => Promise<void>;
  clearNotifications: () => void;
  markNotificationsAsRead: () => void;
  subscribe: () => () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  reviewSummary: null,
  notifications: [],
  isLoading: false,

  fetchReviews: async (silent = false) => {
    if (!silent) set({ isLoading: true });
    try {
      const { data, error } = await db
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReviews: ProductReview[] = (data || []).map(r => {
        let media = [];
        if (Array.isArray(r.media_urls)) {
          media = r.media_urls;
        } else if (typeof r.media_urls === 'string' && r.media_urls.trim()) {
          try { media = JSON.parse(r.media_urls); } catch { media = []; }
        }

        return {
          reviewId: r.id,
          productId: r.product_id,
          customerId: r.user_id,
          customerName: r.customer_name || 'Customer',
          rating: Number(r.rating) || 5,
          reviewText: r.review_text || '',
          mediaUrls: Array.isArray(media) ? media : [],
          adminReply: r.admin_reply,
          status: r.status,
          verified: r.verified === true || r.verified === 'true' || r.verified === 1 || r.verified === '1',
          createdAt: r.created_at,
          phone: r.phone,
          email: r.email,
          orderId: r.order_id,
          deviceIP: r.device_ip,
          anonymous: r.anonymous === true || r.anonymous === 'true' || r.anonymous === 1,
          isPinned: r.is_pinned === true || r.is_pinned === 'true' || r.is_pinned === 1,
          rejectionReason: r.rejection_reason,
          likesCount: 0
        };
      });

      set({ reviews: formattedReviews, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      if (!silent) toast.error('Failed to load reviews');
      set({ isLoading: false });
    }
  },

  fetchReviewSummary: async (productId: string) => {
    try {
      const response = await fetch(`/api/reviews/summary?productId=${productId}`);
      if (response.ok) {
        const summary: ReviewSummaryData = await response.json();
        set({ reviewSummary: summary });
        return summary;
      }
    } catch (e) {
      console.error('Failed to fetch review summary:', e);
    }
    return null;
  },

  toggleLike: async (reviewId: string, userId?: string) => {
    try {
      const effectiveUser = userId || localStorage.getItem('tm_visitor_id') || `visitor_${Math.random().toString(36).substring(2, 9)}`;
      if (!localStorage.getItem('tm_visitor_id')) {
        localStorage.setItem('tm_visitor_id', effectiveUser);
      }

      const res = await fetch(`/api/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUser })
      });

      if (res.ok) {
        const data = await res.json();
        set(state => ({
          reviews: state.reviews.map(r => 
            r.reviewId === reviewId 
              ? { ...r, likesCount: data.likeCount, userLiked: data.isLiked }
              : r
          )
        }));
        return { likeCount: data.likeCount, isLiked: data.isLiked };
      }
    } catch (e) {
      console.error('Failed to toggle review like:', e);
    }
    return null;
  },

  fetchReviewsForProduct: async (productId: string) => {
    set({ isLoading: true });
    try {
      // Parallel fetch reviews and summary
      const [revRes, summary] = await Promise.all([
        fetch(`/api/products/${productId}/reviews`),
        get().fetchReviewSummary(productId)
      ]);

      if (revRes.ok) {
        const data = await revRes.json();
        const formattedReviews: ProductReview[] = (data || []).map((r: any) => ({
          reviewId: r.id,
          productId: r.product_id,
          customerId: r.user_id,
          customerName: r.customer_name || 'Customer',
          rating: Number(r.rating) || 5,
          reviewText: r.review_text || '',
          mediaUrls: Array.isArray(r.media_urls) ? r.media_urls : [],
          adminReply: r.admin_reply,
          status: r.status,
          verified: r.verified === true || r.verified === 'true' || r.verified === 1 || r.verified === '1',
          createdAt: r.created_at,
          phone: r.phone,
          email: r.email,
          orderId: r.order_id,
          deviceIP: r.device_ip,
          anonymous: r.anonymous === true || r.anonymous === 'true' || r.anonymous === 1,
          isPinned: r.is_pinned === true || r.is_pinned === 'true' || r.is_pinned === 1,
          rejectionReason: r.rejection_reason,
          likesCount: r.likes_count || 0
        }));
        set({ reviews: formattedReviews, isLoading: false });
        return;
      }

      // Fallback to Supabase direct query
      const { data, error } = await db
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const formattedReviews: ProductReview[] = (data || []).map(r => {
        let media = [];
        if (Array.isArray(r.media_urls)) {
          media = r.media_urls;
        } else if (typeof r.media_urls === 'string' && r.media_urls.trim()) {
          try { media = JSON.parse(r.media_urls); } catch { media = []; }
        }
        return {
          reviewId: r.id,
          productId: r.product_id,
          customerId: r.user_id,
          customerName: r.customer_name || 'Customer',
          rating: Number(r.rating) || 5,
          reviewText: r.review_text || '',
          mediaUrls: Array.isArray(media) ? media : [],
          adminReply: r.admin_reply,
          status: r.status,
          verified: r.verified === true || r.verified === 'true' || r.verified === 1 || r.verified === '1',
          createdAt: r.created_at,
          phone: r.phone,
          email: r.email,
          orderId: r.order_id,
          deviceIP: r.device_ip,
          anonymous: r.anonymous === true || r.anonymous === 'true' || r.anonymous === 1,
          isPinned: r.is_pinned === true || r.is_pinned === 'true' || r.is_pinned === 1,
          rejectionReason: r.rejection_reason,
          likesCount: 0
        };
      });
      set({ reviews: formattedReviews, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching product reviews:', error);
      set({ isLoading: false });
    }
  },

  // Helper to recalculate product stats and synchronize across stores
  recalculateProductStats: async (productId: string) => {
    try {
      // 1. Call server endpoint to update database products table securely
      const res = await fetch(`/api/reviews/recalculate/${productId}`, { method: 'POST' });
      if (res.ok) {
        const stats = await res.json();
        // Update product in useProductStore if loaded
        try {
          const { useProductStore } = await import('./useProductStore');
          useProductStore.setState((state) => ({
            products: state.products.map(p => 
              p.id === productId ? { ...p, rating: stats.averageRating, reviews: stats.totalReviews } : p
            )
          }));
        } catch {}
      }

      // Also refresh the summary
      await get().fetchReviewSummary(productId);
    } catch (err) {
      console.error("Failed to recalculate product stats:", err);
    }
  },

  addReview: async (newRev) => {
    try {
      // 1. Basic Validation
      if (!newRev.rating) {
        throw new Error('Rating is required.');
      }

      if (!newRev.reviewText || newRev.reviewText.trim().length === 0) {
        throw new Error('Review text is required.');
      }

      // 2. Direct Supabase Insertion
      const { data, error: insertError } = await db
        .from('reviews')
        .insert([{
          product_id: newRev.productId,
          user_id: String(newRev.customerId || 'anonymous'),
          customer_name: String(newRev.customerName || 'Anonymous'),
          rating: Number(newRev.rating),
          review_text: String(newRev.reviewText),
          status: newRev.status || 'approved',
          media_urls: Array.isArray(newRev.mediaUrls) ? newRev.mediaUrls : [],
          verified: newRev.verified ?? true,
          phone: newRev.phone ? String(newRev.phone) : null,
          email: newRev.email ? String(newRev.email) : null,
          order_id: newRev.orderId ? String(newRev.orderId) : null,
          device_ip: newRev.deviceIP,
          anonymous: !!newRev.anonymous,
          is_pinned: false,
          created_at: newRev.createdAt || new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        throw new Error(`Database Error: ${insertError.message}`);
      }

      const insertedData = data;

      // 3. Update local state
      const addedReview: ProductReview = {
        reviewId: insertedData.id,
        productId: newRev.productId,
        customerId: newRev.customerId || 'anonymous',
        customerName: newRev.customerName || 'Anonymous',
        rating: newRev.rating,
        reviewText: newRev.reviewText,
        mediaUrls: newRev.mediaUrls || [],
        status: newRev.status || 'approved',
        verified: newRev.verified ?? true,
        createdAt: newRev.createdAt || new Date().toISOString(),
        phone: newRev.phone,
        email: newRev.email,
        orderId: newRev.orderId,
        deviceIP: newRev.deviceIP,
        anonymous: newRev.anonymous,
        isPinned: false
      };

      set((state) => ({
        reviews: [addedReview, ...state.reviews]
      }));

      // 4. Recalculate product stats if status is approved
      if (newRev.status === 'approved') {
        await get().recalculateProductStats(newRev.productId);
      }

    } catch (error: any) {
      console.error('addReview error:', error);
      throw error;
    }
  },

  updateReview: async (id, updates) => {
    try {
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.adminReply !== undefined) dbUpdates.admin_reply = updates.adminReply;
      if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
      if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
      if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;
      if (updates.customerName) dbUpdates.customer_name = updates.customerName;
      if (updates.reviewText) dbUpdates.review_text = updates.reviewText;
      if (updates.rating) dbUpdates.rating = updates.rating;
      if ((updates as any).productId) dbUpdates.product_id = (updates as any).productId;

      const { error } = await db
        .from('reviews')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      
      // Get the review to know which product to update
      const review = get().reviews.find(r => r.reviewId === id);
      if (review) {
        await get().recalculateProductStats(review.productId);
        // If product was changed, recalculate for the new product too
        if ((updates as any).productId && (updates as any).productId !== review.productId) {
          await get().recalculateProductStats((updates as any).productId);
        }
      }

      await get().fetchReviews();
    } catch (error: any) {
      console.error('Error updating review:', error);
      toast.error('Failed to update review');
    }
  },

  approveReview: async (id) => {
    await get().updateReview(id, { status: 'approved' });
    toast.success('Review approved and published');
  },

  hideReview: async (id) => {
    await get().updateReview(id, { status: 'hidden' });
    toast.success('Review hidden from public');
  },

  rejectReview: async (id, reason) => {
    await get().updateReview(id, { status: 'rejected', rejectionReason: reason });
    toast.success('Review rejected');
  },

  deleteReview: async (id) => {
    try {
      const review = get().reviews.find(r => r.reviewId === id);
      const productId = review?.productId;

      const { error } = await db
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        reviews: state.reviews.filter((r) => r.reviewId !== id)
      }));

      if (productId) {
        await get().recalculateProductStats(productId);
      }

      toast.success('Review deleted permanently');
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  },

  pinReview: async (id) => {
    const review = get().reviews.find(r => r.reviewId === id);
    if (review) {
      await get().updateReview(id, { isPinned: !review.isPinned });
      toast.success(review.isPinned ? 'Review unpinned' : 'Review pinned');
    }
  },

  markVerifiedPurchase: async (id, verified) => {
    await get().updateReview(id, { verified });
  },

  replyToReview: async (id, reply) => {
    await get().updateReview(id, { adminReply: reply });
    toast.success('Reply saved');
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  markNotificationsAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    }));
  },

  subscribe: () => {
    const channel = db
      .channel('public:reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, (payload) => {
        get().fetchReviews(true);
      })
      .subscribe();
      
    return () => {
      db.removeChannel(channel);
    };
  }
}));

