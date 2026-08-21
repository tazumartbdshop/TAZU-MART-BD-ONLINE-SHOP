import { create } from 'zustand';
import { getDb } from '../lib/db';
import { broadcastSync } from '../lib/broadcastSync';

export interface Offer {
  id: string;
  name: string;
  type: 'Flash Sale' | 'Trending Items' | 'Best Selling' | 'Weekly Sale' | 'Eid Sale' | 'New Arrival' | 'Custom Offer' | 'Limited Time Deal' | 'Coupon Offer' | 'Special Campaign' | 'Seasonal Offer' | 'Weekend Deal' | 'Special Discount';
  bannerStyle: string; // Gradient css classes
  startDate: string;
  endDate: string;
  status: 'Active' | 'Hidden';
  homepageVisibility: boolean;
  offersPageVisibility: boolean;
  priority: number; // Added for sorting categories
  showAsFlashSale: boolean;
  showAsTrending: boolean;
  showAsBestSelling: boolean;
  description: string;
  productIds: string[]; // Existing product IDs
  manualProductIds: string[]; // Product IDs added manually that are bound to this offer
  bannerMode?: 'auto' | 'custom';
  banners?: { url: string; link: string }[]; // Updated from customBannerUrls
  customBannerUrls?: string[]; // Backwards compatibility
  autoSlide?: boolean; // Added
  slideDurationSeconds?: number; // Added
  layoutMode?: 'grid' | 'marquee';
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  autoExpire?: boolean;
}

interface OfferState {
  offers: Offer[];
  isLoaded: boolean;
  addOffer: (offer: Omit<Offer, 'id' | 'bannerStyle'>) => void;
  updateOffer: (id: string, updatedFields: Partial<Offer>) => void;
  deleteOffer: (id: string) => void;
  getBannerStyleByType: (type: Offer['type']) => string;
  subscribe: () => () => void;
}

const getBannerStyleByType = (type: Offer['type']) => {
  switch (type) {
    case 'Flash Sale':
      return 'bg-gradient-to-br from-[#E2125B] via-red-600 to-pink-500';
    case 'Trending Items':
      return 'bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600';
    case 'Best Selling':
      return 'bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950';
    case 'Weekly Sale':
      return 'bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-500';
    case 'Eid Sale':
    case 'Seasonal Offer':
      return 'bg-gradient-to-br from-emerald-800 via-green-700 to-teal-900';
    case 'New Arrival':
      return 'bg-gradient-to-br from-amber-600 via-neutral-900 to-neutral-950';
    case 'Limited Time Deal':
      return 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-600';
    case 'Coupon Offer':
      return 'bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600';
    case 'Special Campaign':
      return 'bg-gradient-to-br from-rose-500 via-fuchsia-600 to-purple-600';
    default:
      return 'bg-gradient-to-br from-zinc-800 to-zinc-950';
  }
};

const getCachedOffers = (): Offer[] => {
  try {
    const cached = localStorage.getItem('db_cached_offers') || localStorage.getItem('cached_offers');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse cached offers from localStorage:", e);
  }
  return [];
};

const saveCachedOffers = (offers: Offer[]) => {
  try {
    localStorage.setItem('db_cached_offers', JSON.stringify(offers));
  } catch (e) {
    console.warn("Failed to save offers to localStorage cache:", e);
  }
};

const initialOffers: Offer[] = getCachedOffers();

export const useOfferStore = create<OfferState>((set, get) => ({
  offers: initialOffers,
  isLoaded: initialOffers.length > 0,
  getBannerStyleByType,
  
  subscribe: () => {
    const db = getDb();
    if (!db) return () => {};

    const loadOffers = async () => {
        const { data, error } = await db.from('offers').select('*').order('priority', { ascending: true });
        if (!error && data && data.length > 0) {
            set({ offers: data as Offer[], isLoaded: true });
            saveCachedOffers(data as Offer[]);
        } else if (!error && data && data.length === 0) {
            db.from('offers').upsert(initialOffers).then(({error}) => error && console.warn(error));
            set({ offers: initialOffers, isLoaded: true });
        }
    };
    
    if (!get().isLoaded || get().offers.length === 0) {
      loadOffers();
    } else {
      set({ isLoaded: true });
    }
    
    const channel = db
      .channel('public:offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
         loadOffers();
      })
      .subscribe();

    return () => {
        db.removeChannel(channel);
    };
  },

  addOffer: (offerPayload) => {
    const id = 'o-' + Math.random().toString(36).substring(2, 9);
    const bannerStyle = getBannerStyleByType(offerPayload.type);
    const newOffer: Offer = {
      ...offerPayload,
      priority: offerPayload.priority ?? 0,
      id,
      bannerStyle,
    };
    
    const db = getDb();
    if (db) db.from('offers').insert([newOffer]).then(({error}) => error && console.warn(error));
      
    set((state) => {
      const nextOffers = [newOffer, ...state.offers];
      broadcastSync.publish('offers', nextOffers);
      return { offers: nextOffers };
    });
  },

  updateOffer: (id, updatedFields) => {
    const state = get();
    const updatedOffers = state.offers.map((o) => {
      if (o.id === id) {
        const updated = { ...o, ...updatedFields };
        if (updatedFields.type) {
          updated.bannerStyle = getBannerStyleByType(updatedFields.type);
        }
        return updated;
      }
      return o;
    });
    
    const offerToUpdate = updatedOffers.find(o => o.id === id);
    if (offerToUpdate) {
      const db = getDb();
      if (db) db.from('offers').update(offerToUpdate).eq('id', id).then(({error}) => error && console.warn(error));
    }
    
    set({ offers: updatedOffers });
    broadcastSync.publish('offers', updatedOffers);
  },

  deleteOffer: (id) => {
    const db = getDb();
    if (db) db.from('offers').delete().eq('id', id).then(({error}) => error && console.warn(error));
      
    set((state) => {
      const nextOffers = state.offers.filter((o) => o.id !== id);
      broadcastSync.publish('offers', nextOffers);
      return { offers: nextOffers };
    });
  },
}));
