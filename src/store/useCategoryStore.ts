import { create } from 'zustand';
import { getDb } from '../lib/db';
import { deleteImage } from '../lib/imageUtils';
import { objectToSnake, objectToCamel } from '../lib/dbUtils';
import { broadcastSync } from '../lib/broadcastSync';

export interface Category {
  id: string;
  name: string;
  bannerName: string;
  slug: string;
  bannerImage: string;
  bannerImages?: string[];
  iconImage?: string;
  wideBannerImage?: string;
  buttonText?: string;
  buttonLink?: string;
  featuredProducts?: string;
  description?: string;
  displayOrder: number;
  status: 'Active' | 'Inactive';
  showOnHomepage: boolean;
  createdAt: number;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  isDemo?: boolean;
  sliderSettings?: any;
  imageUrl?: string;
  image_url?: string;
}

export const CATEGORY_FALLBACKS = [];

export function resolveCategoryThumbnail(cat: Partial<Category> | null | undefined): string {
  if (!cat) return '';
  if (cat.imageUrl && cat.imageUrl.trim() !== '') {
    return ensureAbsoluteUrl(cat.imageUrl);
  }
  if (cat.image_url && cat.image_url.trim() !== '') {
    return ensureAbsoluteUrl(cat.image_url);
  }
  if (cat.iconImage && cat.iconImage.trim() !== '') {
    return ensureAbsoluteUrl(cat.iconImage);
  }
  if (cat.bannerImage && cat.bannerImage.trim() !== '') {
    return ensureAbsoluteUrl(cat.bannerImage);
  }
  if (cat.bannerImages && Array.isArray(cat.bannerImages) && cat.bannerImages.length > 0 && cat.bannerImages[0]) {
    return ensureAbsoluteUrl(cat.bannerImages[0]);
  }
  return '';
}

interface CategoryState {
  categories: Category[];
  isLoaded: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<any>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<any>;
  deleteCategory: (id: string) => Promise<void>;
  clearDemoData: () => void;
  subscribe: () => () => void;
}

const getInitialCategories = (): Category[] => {
  return [];
};

// Strict list of actual database columns present in the MySQL `categories` table
const VALID_CATEGORY_COLUMNS = new Set([
  'id',
  'name',
  'slug',
  'banner_name',
  'banner_image',
  'banner_images',
  'gallery_images',
  'icon_image',
  'wide_banner_image',
  'button_text',
  'button_link',
  'featured_products',
  'description',
  'display_order',
  'status',
  'show_on_homepage',
  'homepage_visibility',
  'created_at',
  'updated_at',
  'meta_title',
  'meta_description',
  'keywords',
  'is_demo',
  'slider_settings',
  'image_url',
  'image',
  'thumbnail'
]);

// Helper to strictly prune payload to only include actual database columns before query
export const pruneInvalidCategoryColumns = (payload: any) => {
  const pruned: any = {};
  Object.keys(payload).forEach(key => {
    if (VALID_CATEGORY_COLUMNS.has(key)) {
      pruned[key] = payload[key];
    } else {
      console.warn(`[Prune Column] Filtered out invalid category column '${key}' from database write payload`);
    }
  });
  return pruned;
};

// Cache of columns detected as non-existent to avoid redundant network attempts
const knownInvalidColumns = new Set<string>();

async function executeWithSelfHealing(
  action: (payload: any) => Promise<{ data: any; error: any; status: number; statusText: string }>,
  initialPayload: any
): Promise<{ data: any; error: any; status: number; statusText: string }> {
  // Always pre-prune to prevent issues
  let dbPayload = pruneInvalidCategoryColumns(initialPayload);
  
  // Prune any column already known to be invalid
  for (const col of knownInvalidColumns) {
    delete dbPayload[col];
  }

  let attempts = 0;
  const maxAttempts = 25;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`[Self-Healing Client] Attempting DB write (Attempt ${attempts}/${maxAttempts}) with keys:`, Object.keys(dbPayload));
    
    const result = await action(dbPayload);
    
    if (result.error) {
      const errMsg = String(result.error.message || '');
      const errCode = String(result.error.code || '');
      
      console.warn(`[Self-Healing Error Received] Code: ${errCode} | Status: ${result.status} | Msg: ${errMsg}`);
      
      // PGRST204: column not found. PGRST205: table/relation mismatch. 42703: undefined_column.
      // Also match MySQL "Unknown column" or "field list" issues
      if (
        errCode === 'PGRST204' || 
        errCode === 'PGRST205' || 
        errCode === '42703' || 
        result.status === 400 || 
        errMsg.toLowerCase().includes('unknown column') || 
        errMsg.toLowerCase().includes('field list')
      ) {
        let badCol = '';
        
        // Match 1: "Could not find the 'banner_image' column"
        const match1 = errMsg.match(/['"“]([a-zA-Z0-9_]+)['"”]\s+column/i);
        if (match1) badCol = match1[1];
        
        // Match 2: "column categories.display_order does not exist"
        if (!badCol) {
          const match2 = errMsg.match(/column\s+['"“]?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)/i);
          if (match2) badCol = match2[1];
        }

        // Match MySQL: "Unknown column 'image_url' in 'field list'"
        if (!badCol) {
          const mysqlMatch = errMsg.match(/Unknown column ['"“]?([a-zA-Z0-9_]+)['"”]? in/i);
          if (mysqlMatch) badCol = mysqlMatch[1];
        }
        
        // Fallback: find any word term mentioned in quotes that exists in the payload keys
        if (!badCol) {
          const matches = errMsg.match(/['"“]([a-zA-Z0-9_]+)['"”]/g);
          if (matches) {
            for (const item of matches) {
              const cleaned = item.replace(/['"“’”]/g, '');
              if (dbPayload[cleaned] !== undefined) {
                badCol = cleaned;
                break;
              }
            }
          }
        }

        if (badCol) {
          console.warn(`[Self-Healing Database Engine] Pruning non-existent column '${badCol}' and retrying write...`);
          knownInvalidColumns.add(badCol);
          delete dbPayload[badCol];
          continue;
        }
      }
      return result;
    }
    return result;
  }
  return { data: null, error: new Error("Too many self-healing retrieval attempts"), status: 400, statusText: "Bad Request" };
}

// Initial state helper to read from localStorage synchronous cache
const getCachedCategories = (): Category[] => {
  try {
    const cached = localStorage.getItem('db_cached_categories');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse cached categories from localStorage:", e);
  }
  return [];
};

const saveCachedCategories = (categories: Category[]) => {
  try {
    localStorage.setItem('db_cached_categories', JSON.stringify(categories));
  } catch (e) {
    console.warn("Failed to save categories to localStorage cache:", e);
  }
};

export const ensureAbsoluteUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  let trimmed = url.trim();
  
  // Strip any absolute host prefix containing '/uploads/' to convert to root-relative path
  const uploadsIdx = trimmed.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    trimmed = trimmed.substring(uploadsIdx);
  }
  
  if (trimmed.startsWith('/uploads/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${trimmed}`;
    }
  }
  return trimmed;
};

export const mapDbToCategory = (row: any): Category => {
  if (!row) return row;
  const camelRow: any = objectToCamel(row);
  
  let bannerImages = camelRow.bannerImages || camelRow.galleryImages;
  if (typeof bannerImages === 'string') {
    try {
      bannerImages = JSON.parse(bannerImages);
    } catch {
      bannerImages = bannerImages ? [bannerImages] : [];
    }
  }
  if (!Array.isArray(bannerImages)) {
    bannerImages = camelRow.bannerImage ? [camelRow.bannerImage] : [];
  }

  const finalBannerImages = bannerImages.map(img => ensureAbsoluteUrl(img));
  const rawIcon = camelRow.iconImage || camelRow.imageUrl || camelRow.image || camelRow.thumbnail || '';
  const rawBanner = camelRow.bannerImage || (bannerImages[0] || '');
  const rawWide = camelRow.wideBannerImage || '';

  return {
    id: camelRow.id || '',
    name: camelRow.name || '',
    slug: camelRow.slug || '',
    bannerName: camelRow.bannerName || camelRow.name || '',
    bannerImage: ensureAbsoluteUrl(rawBanner),
    bannerImages: finalBannerImages,
    iconImage: ensureAbsoluteUrl(rawIcon),
    wideBannerImage: ensureAbsoluteUrl(rawWide),
    buttonText: camelRow.buttonText || '',
    buttonLink: camelRow.buttonLink || '',
    featuredProducts: typeof camelRow.featuredProducts === 'object' ? JSON.stringify(camelRow.featuredProducts) : (camelRow.featuredProducts || ''),
    description: camelRow.description || '',
    displayOrder: Number(camelRow.displayOrder ?? 1),
    status: (camelRow.status === 'Active' || camelRow.status === 'active') ? 'Active' : 'Inactive',
    showOnHomepage: camelRow.showOnHomepage !== undefined 
      ? (camelRow.showOnHomepage === true || camelRow.showOnHomepage === 1 || String(camelRow.showOnHomepage) === '1' || String(camelRow.showOnHomepage).toLowerCase() === 'true')
      : (camelRow.homepageVisibility !== undefined 
          ? (camelRow.homepageVisibility === true || camelRow.homepageVisibility === 1 || String(camelRow.homepageVisibility) === '1' || String(camelRow.homepageVisibility).toLowerCase() === 'true')
          : true),
    createdAt: Number(camelRow.createdAt) || (camelRow.created_at ? new Date(camelRow.created_at).getTime() : Date.now()),
    metaTitle: camelRow.metaTitle || '',
    metaDescription: camelRow.metaDescription || '',
    keywords: camelRow.keywords || '',
    isDemo: false,
    sliderSettings: camelRow.sliderSettings || null,
    imageUrl: ensureAbsoluteUrl(rawIcon),
    image_url: ensureAbsoluteUrl(rawIcon)
  };
};

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: getCachedCategories(),
  isLoaded: getCachedCategories().length > 0,
  
  fetchCategories: async () => {
    try {
      const apiRes = await fetch('/api/categories', {
        headers: { 'Accept': 'application/json' }
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.categories && Array.isArray(apiData.categories)) {
          const mappedData = apiData.categories.map(mapDbToCategory).sort((a: any, b: any) => Number(a.displayOrder) - Number(b.displayOrder));
          set({ categories: mappedData, isLoaded: true });
          saveCachedCategories(mappedData);
          broadcastSync.publish('categories', mappedData);
          return;
        }
      }
    } catch (e) {
      console.warn("Direct /api/categories fetch failed, fallback to db client...", e);
    }

    const db = getDb();
    if (db) {
      try {
        const { data, error } = await db.from('categories').select('*');
        if (!error && data) {
          const mappedData = data.map(mapDbToCategory).sort((a: any, b: any) => Number(a.displayOrder) - Number(b.displayOrder));
          set({ categories: mappedData, isLoaded: true });
          saveCachedCategories(mappedData);
          broadcastSync.publish('categories', mappedData);
        }
      } catch (dbErr) {
        console.warn("Categories db select error:", dbErr);
      }
    }
  },

  addCategory: async (payload) => {
    const db = getDb();
    const id = `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newCategory: Category = {
      ...payload,
      id,
      createdAt: Date.now(),
    };
    
    // Transform to snake_case for MySQL/Postgres
    const dbPayload: any = objectToSnake(newCategory);
    if (payload.bannerImages) {
      dbPayload.banner_images = payload.bannerImages;
      dbPayload.gallery_images = payload.bannerImages;
    }
    if (payload.showOnHomepage !== undefined) {
      dbPayload.show_on_homepage = payload.showOnHomepage;
      dbPayload.homepage_visibility = payload.showOnHomepage;
    }
    
    // Optimistic Update
    const currentCats = get().categories;
    const nextCats = [newCategory, ...currentCats.filter(c => c.id !== id)];
    set({ categories: nextCats, isLoaded: true });
    saveCachedCategories(nextCats);
    broadcastSync.publish('categories', nextCats);

    let savedRecord = null;

    // 1. Direct REST API POST (Await to ensure success)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(dbPayload)
      });
      
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errJson = await res.json();
          throw new Error(errJson.error || `Server responded with status ${res.status}`);
        } else {
          const text = await res.text();
          if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
            throw new Error(`Critical Error: API returned HTML instead of JSON. This usually means the API route was not found and the server fell back to the SPA index.html. Check server.ts routes.`);
          }
          throw new Error(`Server Error (${res.status}): ${text.substring(0, 100)}...`);
        }
      }
      
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Invalid Response: Expected JSON but received ${contentType || 'plain text'}. Content: ${text.substring(0, 100)}...`);
      }

      const resJson = await res.json();
      if (resJson && resJson.success) {
        savedRecord = resJson.category;
      }
    } catch (apiErr: any) {
      console.error("Direct POST /api/categories failed:", apiErr);
      throw apiErr;
    }
    
    // 2. QueryBuilder insertion for full cross-compatibility
    if (db) {
      try {
        await executeWithSelfHealing(
          async (prunedDbPayload) => {
            return await db.from('categories').insert([prunedDbPayload]).select();
          },
          dbPayload
        );
      } catch (err: any) {
        console.warn("Category insert via QueryBuilder notice:", err);
      }
    }

    // 3. Background fresh sync
    try {
      const res = await fetch('/api/categories', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.categories && Array.isArray(resData.categories)) {
          const mapped = resData.categories.map(mapDbToCategory);
          set({ categories: mapped, isLoaded: true });
          saveCachedCategories(mapped);
          broadcastSync.publish('categories', mapped);
        }
      }
    } catch (fetchErr) {
      console.warn("Background category sync after add:", fetchErr);
    }

    return savedRecord || dbPayload;
  },
  
  updateCategory: async (id, payload) => {
    const db = getDb();
    const currentCats = get().categories;
    const existing = currentCats.find(c => c.id === id);
    const mergedPayload = existing ? { ...existing, ...payload } : payload;
    
    // Transform to snake_case for DB
    const dbPayload: any = objectToSnake(mergedPayload);
    delete dbPayload.id;
    delete dbPayload.created_at;
    if (payload.bannerImages) {
      dbPayload.banner_images = payload.bannerImages;
      dbPayload.gallery_images = payload.bannerImages;
    }
    if (payload.showOnHomepage !== undefined) {
      dbPayload.show_on_homepage = payload.showOnHomepage;
      dbPayload.homepage_visibility = payload.showOnHomepage;
    }
    
    // Optimistic Update
    const updatedCats = currentCats.map(c => c.id === id ? { ...c, ...mergedPayload } : c);
    set({ categories: updatedCats as Category[], isLoaded: true });
    saveCachedCategories(updatedCats as Category[]);
    broadcastSync.publish('categories', updatedCats as Category[]);

    let savedRecord = null;

    // 1. Direct REST PUT (Await to ensure success)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(dbPayload)
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errJson = await res.json();
          throw new Error(errJson.error || `Server responded with status ${res.status}`);
        } else {
          const text = await res.text();
          if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
            throw new Error(`Critical Error: API returned HTML instead of JSON. This usually means the API route was not found.`);
          }
          throw new Error(`Server Error (${res.status}): ${text.substring(0, 100)}...`);
        }
      }

      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Invalid Response: Expected JSON but received ${contentType || 'plain text'}. Content: ${text.substring(0, 100)}...`);
      }

      const resJson = await res.json();
      if (resJson && resJson.success) {
        savedRecord = resJson.category;
      }
    } catch (apiErr: any) {
      console.error("Direct PUT /api/categories failed:", apiErr);
      throw apiErr;
    }
    
    // 2. QueryBuilder update
    if (db) {
      try {
        await executeWithSelfHealing(
          async (prunedDbPayload) => {
            return await db.from('categories').update(prunedDbPayload).eq('id', id).select();
          },
          dbPayload
        );
      } catch (err: any) {
        console.warn("Category update via QueryBuilder notice:", err);
      }
    }

    // 3. Background fresh sync
    try {
      const res = await fetch('/api/categories', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.categories && Array.isArray(resData.categories)) {
          const mapped = resData.categories.map(mapDbToCategory);
          set({ categories: mapped, isLoaded: true });
          saveCachedCategories(mapped);
          broadcastSync.publish('categories', mapped);
        }
      }
    } catch (fetchErr) {
      console.warn("Background category sync after update:", fetchErr);
    }

    return savedRecord || dbPayload;
  },
  
  deleteCategory: async (id) => {
    const currentCats = get().categories;
    const category = currentCats.find(c => c.id === id);
    const db = getDb();
    
    if (category) {
      try {
        const urlsToDelete = new Set<string>();
        if (category.iconImage) urlsToDelete.add(category.iconImage);
        if (category.bannerImage) urlsToDelete.add(category.bannerImage);
        if (category.wideBannerImage) urlsToDelete.add(category.wideBannerImage);
        if (category.bannerImages && Array.isArray(category.bannerImages)) {
          category.bannerImages.forEach(img => {
            if (img) urlsToDelete.add(img);
          });
        }
        
        // Execute background deletions securely
        Promise.all(Array.from(urlsToDelete).map(url => deleteImage(url)))
          .catch(err => console.warn("Failed to delete some category storage files:", err));
      } catch (importErr) {
        console.error("Failed to import imageUtils during deleteCategory:", importErr);
      }
    }
    
    // Optimistic Update
    const newCats = currentCats.filter(c => c.id !== id);
    set({ categories: newCats, isLoaded: true });
    saveCachedCategories(newCats);
    broadcastSync.publish('categories', newCats);

    // 1. Direct REST DELETE
    try {
      await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
    } catch (apiErr) {
      console.warn("Direct DELETE /api/categories notice:", apiErr);
    }
    
    // 2. QueryBuilder delete
    if (db) {
      try {
        await db.from('categories').delete().eq('id', id);
      } catch (err: any) {
        console.warn("Category delete via QueryBuilder notice:", err);
      }
    }
  },
  
  clearDemoData: () => {
    set({ categories: [] });
    saveCachedCategories([]);
  },
  
  subscribe: () => {
    const db = getDb();
    if (!db) {
        console.warn("[Supabase Categories Sync] Supabase client is not available or configured. Defaulting to empty array.");
        set({ isLoaded: true });
        return () => {}; // fallback
    }

    // Core Fetch Function
    const fetchCategoriesData = async () => {
      try {
        // Try direct backend API first
        const apiRes = await fetch('/api/categories', {
          headers: { 'Accept': 'application/json' }
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.categories && Array.isArray(apiData.categories)) {
            const mappedData = apiData.categories.map(mapDbToCategory).sort((a: any, b: any) => Number(a.displayOrder) - Number(b.displayOrder));
            set({ categories: mappedData, isLoaded: true });
            saveCachedCategories(mappedData);
            broadcastSync.publish('categories', mappedData);
            return;
          }
        }
      } catch (e) {
        console.warn("Direct /api/categories fetch failed, trying db bridge...", e);
      }

      db.from('categories').select('*')
        .then(({ data, error }) => {
          if (error) {
            console.warn("[Categories FETCH ERROR]:", error);
            set({ isLoaded: true });
          } else if (data) {
            try {
              const mappedData = data.map(mapDbToCategory).sort((a: any, b: any) => Number(a.displayOrder) - Number(b.displayOrder));
              set({ categories: mappedData, isLoaded: true });
              saveCachedCategories(mappedData);
              broadcastSync.publish('categories', mappedData);
            } catch (err) {
              console.error("[Categories Processing Error]:", err);
              set({ isLoaded: true });
            }
          } else {
            set({ isLoaded: true });
          }
      }, (err) => {
          console.warn("[Categories Fetch CONNECTION ERROR]:", err);
          set({ isLoaded: true });
      });
    };

    // 1. Initial Load only if not already loaded in memory/cache
    if (!get().isLoaded || get().categories.length === 0) {
      fetchCategoriesData();
    } else {
      set({ isLoaded: true });
    }

    // 2. Real-time changes subscription (event driven, no polling)
    let channel: any = null;
    try {
      channel = db
        .channel('public:categories:' + Math.random().toString(36).substring(2, 9))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
          console.log("[Supabase Categories Sync] Real-time postgres_changes event received:", payload);
          fetchCategoriesData();
        })
        .subscribe();
    } catch (realtimeErr) {
      console.warn("[Supabase Categories Real-time Subscription - Suppressed]:", realtimeErr);
    }

    // 3. Cleanup
    return () => {
      if (channel) {
        try {
          db.removeChannel(channel);
        } catch (e) {}
      }
    };
  }
}));

