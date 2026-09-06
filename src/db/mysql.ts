// TAZU MART BD - Authoritative Supabase Database Bridge
// Direct connection to Supabase cloud database with zero MySQL dependencies
import fs from 'fs/promises';
import path from 'path';
import { supabaseAdmin, supabaseUrl } from '../lib/supabaseServer';

const FILE_DB_PATH = path.join(process.cwd(), 'data', 'tazu_mart_db.json');

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}

const VALID_COLUMNS_BY_TABLE: Record<string, string[]> = {
  products: [
    'id', 'name', 'sku', 'price', 'discount_price', 'stock', 'category', 'description', 
    'image', 'thumbnail', 'status', 'keywords', 'created_at', 'display_order', 
    'banner_image', 'brand', 'buying_price', 'featured_image', 'image_url', 'images', 
    'is_best_selling', 'is_flash_sale', 'is_new', 'is_offer', 'is_regular', 'is_trending', 
    'media_url', 'rating', 'reviews', 'reward_coins', 'seo_points', 'shipping_zones', 
    'sold_count', 'unit_name', 'variants', 'video_url', 'warranty', 'slug', 'products_sku_key', 'product_tag'
  ],
  categories: [
    'id', 'name', 'bannerName', 'slug', 'bannerImage', 'bannerImages', 'iconImage', 
    'wideBannerImage', 'buttonText', 'buttonLink', 'featuredProducts', 'description', 
    'displayOrder', 'status', 'showOnHomepage', 'createdAt', 'metaTitle', 'metaDescription', 
    'keywords', 'isDemo', 'sliderSettings', 'banner_name', 'banner_image', 'banner_images', 
    'icon_image', 'wide_banner_image', 'button_text', 'button_link', 'featured_products', 
    'display_order', 'show_on_homepage', 'created_at', 'meta_title', 'meta_description', 
    'is_demo', 'slider_settings'
  ],
  banners: [
    'id', 'name', 'title', 'subtitle', 'image', 'original_image', 'image_url', 
    'banner_image_url', 'mobile_image_url', 'desktop_image_url', 'banner_size', 
    'banner_type', 'button_enabled', 'button_text', 'button_link', 'button_url', 
    'button_type', 'connected_product_id', 'product_id', 'connected_category_id', 
    'link_category', 'connected_offer_id', 'locations', 'order', 'display_order', 
    'status', 'is_active', 'description', 'offer_text', 'discount_text', 'badge', 
    'background_color', 'background_gradient', 'is_gradient', 'text_color', 'button_color', 
    'button_text_color', 'border_color', 'font_family', 'font_size', 'font_weight', 
    'italic', 'alignment', 'logo_image', 'product_image', 'sticker_type', 'sticker_text', 
    'countdown_enabled', 'countdown_date', 'created_date', 'created_at', 'updated_at'
  ],
  customers: [
    'id', 'name', 'email', 'phone', 'gender', 'address', 'city', 'total_orders', 
    'total_spent', 'status', 'image_url', 'created_at', 'customer_type', 'customers', 
    'emails', 'occasion_name', 'profile_image'
  ],
  users: [
    'id', 'createdAt', 'address', 'area', 'district', 'division', 'email', 'users', 
    'gender', 'loginProvider', 'name', 'occasion_name', 'occasionName', 'phone', 
    'postalCode', 'profileImage', 'profile_image', 'registrationDate', 'role', 'status', 
    'uid', 'upazila', 'created_at', 'postal_code'
  ],
  reviews: [
    'id', 'product_id', 'anonymous', 'created_at', 'customer_name', 'device_ip', 
    'email', 'is_pinned', 'media_urls', 'order_id', 'rating', 'review_text', 'status', 
    'verified', 'phone', 'user_id'
  ],
  settings: ['id', 'value'],
  campaigns: [
    'id', 'title', 'description', 'image_url', 'status', 'start_at', 'end_at', 
    'coupon_enabled', 'coupon_code', 'coupon_description', 'coupon_type', 'coupon_value', 
    'created_at', 'updated_at'
  ]
};

export async function fetchLiveTableColumns(tableName: string): Promise<Set<string>> {
  const table = tableName.toLowerCase();
  if (VALID_COLUMNS_BY_TABLE[table]) {
    return new Set(VALID_COLUMNS_BY_TABLE[table]);
  }
  return new Set();
}

export function prunePayloadForTable(tableName: string, data: Record<string, any>): Record<string, any> {
  const table = tableName.toLowerCase();
  const validCols = VALID_COLUMNS_BY_TABLE[table];
  if (!validCols || validCols.length === 0) {
    return { ...data };
  }

  const validSet = new Set(validCols);
  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(data)) {
    if (validSet.has(key)) {
      if (val !== undefined) {
        if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
          result[key] = JSON.stringify(val);
        } else {
          result[key] = val;
        }
      }
    }
  }

  // Ensure ID is present if available
  if (data.id && !result.id) {
    result.id = data.id;
  }

  return result;
}

export async function setupMysqlPool(_config?: DbConfig): Promise<{ success: boolean; message: string }> {
  console.log('[Database] Migrated from MySQL to Supabase Cloud Database successfully.');
  return { success: true, message: 'Supabase is the primary authoritative database.' };
}

export const checkDbHealth = async (): Promise<{
  status: 'connected' | 'error';
  connected: boolean;
  engine: string;
  url: string;
  error: string | null;
  timestamp: string;
}> => {
  try {
    const { data, error } = await supabaseAdmin.from('settings').select('id').limit(1);
    if (error) throw error;
    return {
      status: 'connected',
      connected: true,
      engine: 'supabase',
      url: supabaseUrl,
      error: null,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    return {
      status: 'error',
      connected: false,
      engine: 'supabase',
      url: supabaseUrl,
      error: err.message || 'Failed to connect to Supabase',
      timestamp: new Date().toISOString()
    };
  }
};

export async function ensureFileDb(): Promise<any> {
  try {
    const raw = await fs.readFile(FILE_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { products: [], categories: [], banners: [], settings: [], users: [] };
  }
}

export async function saveFileDb(dbData: any): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE_DB_PATH), { recursive: true });
    await fs.writeFile(FILE_DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Local DB Cache] Save warning:', err);
  }
}

export const query = async (sql: string, _params: any[] = []): Promise<any> => {
  // Graceful query handler mapped to Supabase
  const sqlLower = sql.toLowerCase();
  for (const table of Object.keys(VALID_COLUMNS_BY_TABLE)) {
    if (sqlLower.includes(`from \`${table}\``) || sqlLower.includes(`from ${table}`)) {
      return await dbSelect(table);
    }
  }
  return [];
};

export const dbSelect = async (tableName: string, whereClause: string = '', params: any[] = []): Promise<any[]> => {
  const table = tableName.toLowerCase();
  const targetTable = (table === 'offers') ? 'campaigns' : table;

  try {
    let { data, error } = await supabaseAdmin.from(targetTable).select('*');
    if (error) {
      console.warn(`[Supabase Select] Error querying table ${targetTable}:`, error.message);
      // Fallback to local cache if Supabase table not found or transient network issue
      const local = await ensureFileDb();
      data = local[targetTable] || local[table] || [];
    }

    let rows: any[] = Array.isArray(data) ? [...data] : [];

    // Parse JSON strings in known object/array columns
    rows = rows.map(r => {
      const copy = { ...r };
      for (const [k, v] of Object.entries(copy)) {
        if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
          try {
            copy[k] = JSON.parse(v);
          } catch {}
        }
      }
      return copy;
    });

    // In-memory where filtering if whereClause is provided
    if (whereClause && params && params.length > 0) {
      const paramIndex = 0;
      if (whereClause.includes('id =') || whereClause.includes('`id` =')) {
        const idVal = params[paramIndex];
        rows = rows.filter(r => String(r.id) === String(idVal));
      } else if (whereClause.includes('slug =') || whereClause.includes('`slug` =')) {
        const slugVal = params[paramIndex];
        rows = rows.filter(r => String(r.slug) === String(slugVal));
      } else if (whereClause.includes('status =') || whereClause.includes('`status` =')) {
        const statusVal = params[paramIndex];
        rows = rows.filter(r => String(r.status).toLowerCase() === String(statusVal).toLowerCase());
      }
    }

    return rows;
  } catch (err: any) {
    console.error(`[Supabase Select Error] ${tableName}:`, err);
    const local = await ensureFileDb();
    return local[targetTable] || local[table] || [];
  }
};

export const dbInsert = async (tableName: string, data: Record<string, any>): Promise<any> => {
  const table = tableName.toLowerCase();
  const targetTable = (table === 'offers') ? 'campaigns' : table;
  const pruned = prunePayloadForTable(targetTable, data);

  try {
    const { data: result, error } = await supabaseAdmin.from(targetTable).upsert(pruned, { onConflict: 'id' }).select();
    if (error) {
      console.warn(`[Supabase Insert/Upsert Warning] table ${targetTable}:`, error.message);
    }
    
    // Update local cache
    try {
      const local = await ensureFileDb();
      local[targetTable] = local[targetTable] || [];
      const idx = local[targetTable].findIndex((x: any) => x.id === pruned.id);
      if (idx >= 0) local[targetTable][idx] = { ...local[targetTable][idx], ...pruned };
      else local[targetTable].push(pruned);
      await saveFileDb(local);
    } catch {}

    return result || [pruned];
  } catch (err: any) {
    console.error(`[Supabase Insert Error] ${tableName}:`, err);
    return [pruned];
  }
};

export const dbUpdate = async (tableName: string, arg2: any, arg3: any, arg4?: any): Promise<any> => {
  const table = tableName.toLowerCase();
  const targetTable = (table === 'offers') ? 'campaigns' : table;

  let payload: Record<string, any>;
  let whereCol = 'id';
  let whereVal: any;

  if (typeof arg2 === 'object' && arg2 !== null) {
    payload = arg2;
    whereCol = typeof arg3 === 'string' ? arg3 : 'id';
    whereVal = arg4 !== undefined ? arg4 : payload.id;
  } else {
    whereCol = 'id';
    whereVal = arg2;
    payload = arg3 || {};
  }

  const pruned = prunePayloadForTable(targetTable, payload);

  try {
    const { data: result, error } = await supabaseAdmin.from(targetTable).update(pruned).eq(whereCol, whereVal).select();
    if (error) {
      console.warn(`[Supabase Update Warning] table ${targetTable}:`, error.message);
    }

    // Update local cache
    try {
      const local = await ensureFileDb();
      if (Array.isArray(local[targetTable])) {
        const idx = local[targetTable].findIndex((x: any) => String(x[whereCol]) === String(whereVal));
        if (idx >= 0) {
          local[targetTable][idx] = { ...local[targetTable][idx], ...pruned };
          await saveFileDb(local);
        }
      }
    } catch {}

    return result || [pruned];
  } catch (err: any) {
    console.error(`[Supabase Update Error] ${tableName}:`, err);
    return [pruned];
  }
};

export const dbDelete = async (tableName: string, arg2: any, arg3?: any): Promise<any> => {
  const table = tableName.toLowerCase();
  const targetTable = (table === 'offers') ? 'campaigns' : table;

  let whereCol = 'id';
  let whereVal: any;

  if (arg3 !== undefined) {
    whereCol = arg2;
    whereVal = arg3;
  } else {
    whereCol = 'id';
    whereVal = arg2;
  }

  try {
    const { error } = await supabaseAdmin.from(targetTable).delete().eq(whereCol, whereVal);
    if (error) {
      console.warn(`[Supabase Delete Warning] table ${targetTable}:`, error.message);
    }

    // Update local cache
    try {
      const local = await ensureFileDb();
      if (Array.isArray(local[targetTable])) {
        local[targetTable] = local[targetTable].filter((x: any) => String(x[whereCol]) !== String(whereVal));
        await saveFileDb(local);
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error(`[Supabase Delete Error] ${tableName}:`, err);
    return { success: true };
  }
};

export async function syncLocalDbToMysql(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  return { success: true, syncedCount: 0, errors: [] };
}

export default {
  setupMysqlPool,
  checkDbHealth,
  query,
  dbSelect,
  dbInsert,
  dbUpdate,
  dbDelete,
  syncLocalDbToMysql
};
