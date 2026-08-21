import { create } from 'zustand';
import { getDb } from '../lib/db';

export interface FlutterBanner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  redirectLink: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface FlutterBannerStore {
  flutterBanners: FlutterBanner[];
  loading: boolean;
  isLoaded: boolean;
  fetchFlutterBanners: () => Promise<void>;
  subscribeFlutterBanners: () => () => void;
  addFlutterBanner: (banner: Omit<FlutterBanner, 'id' | 'createdAt'>) => Promise<void>;
  updateFlutterBanner: (id: string, updates: Partial<FlutterBanner>) => Promise<void>;
  deleteFlutterBanner: (id: string) => Promise<void>;
}

export const useFlutterBannerStore = create<FlutterBannerStore>((set, get) => ({
  flutterBanners: [],
  loading: false,
  isLoaded: false,

  fetchFlutterBanners: async () => {
    set({ loading: true });
    try {
      const db = getDb();
      if (!db) throw new Error("Supabase internal error");
      const { data, error } = await db.from('flutterBanners').select('*').order('displayOrder', { ascending: true });
      if (error) throw error;
      set({ flutterBanners: data as FlutterBanner[], isLoaded: true, loading: false });
    } catch (error) {
      console.error("Error fetching flutter banners:", error);
      set({ loading: false });
    }
  },

  subscribeFlutterBanners: () => {
    const db = getDb();
    if (!db) return () => {};

    const loadBanners = async () => {
        const { data, error } = await db.from('flutterBanners').select('*').order('displayOrder', { ascending: true });
        if (!error && data) {
            set({ flutterBanners: data as FlutterBanner[], isLoaded: true });
        }
    };
    
    loadBanners();
    
    const channel = db
      .channel('public:flutterBanners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flutterBanners' }, () => {
         loadBanners();
      })
      .subscribe();

    return () => {
        db.removeChannel(channel);
    };
  },

  addFlutterBanner: async (banner) => {
    try {
      const newId = 'fb-' + Math.random().toString(36).substring(2, 9);
      const payload: FlutterBanner = {
        ...banner,
        id: newId,
        createdAt: new Date().toISOString(),
      };
      const db = getDb();
      if (db) {
          const { error } = await db.from('flutterBanners').insert([payload]);
          if(error) throw error;
      }
    } catch (error) {
      console.error("Error adding flutter banner:", error);
      throw error;
    }
  },

  updateFlutterBanner: async (id, updates) => {
    try {
      const db = getDb();
      if (db) {
          const { error } = await db.from('flutterBanners').update(updates).eq('id', id);
          if(error) throw error;
      }
    } catch (error) {
      console.error("Error updating flutter banner:", error);
      throw error;
    }
  },

  deleteFlutterBanner: async (id) => {
    try {
      const db = getDb();
      if (db) {
          const { error } = await db.from('flutterBanners').delete().eq('id', id);
          if (error) throw error;
      }
    } catch (error) {
      console.error("Error deleting flutter banner:", error);
      throw error;
    }
  },
}));
