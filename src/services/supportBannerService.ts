import { getDb } from '../lib/db';

export interface SupportBannerData {
  id: string;
  banner_image: string;
  heading: string;
  sub_heading: string;
  button_text: string;
  button_link: string;
  status: boolean;
  updated_at?: number;
}

const DEFAULT_BANNER: SupportBannerData = {
  id: 'supportBanner',
  banner_image: '',
  heading: '',
  sub_heading: '',
  button_text: '',
  button_link: '',
  status: false
};

export const supportBannerService = {
  async getBanner(): Promise<SupportBannerData> {
    try {
      const db = getDb();
      if (!db) return DEFAULT_BANNER;
      
      const { data, error } = await db.from('settings').select('*').eq('id', 'supportBanner').single();
      if (data && !error) {
        return { ...DEFAULT_BANNER, ...data };
      } else {
        await db.from('settings').upsert([DEFAULT_BANNER]);
        return DEFAULT_BANNER;
      }
    } catch (e) {
      console.error("Supabase getBanner failed, using fallback:", e);
      return DEFAULT_BANNER;
    }
  },

  async updateBanner(updates: Partial<SupportBannerData>): Promise<void> {
    try {
      const db = getDb();
      if (!db) return;
      
      const current = await this.getBanner();
      const updatedStr = {
        ...current,
        ...updates,
        updated_at: Date.now()
      };
      await db.from('settings').upsert([updatedStr]);
    } catch (e) {
      console.error("Supabase updateBanner failed:", e);
      throw e;
    }
  }
};
