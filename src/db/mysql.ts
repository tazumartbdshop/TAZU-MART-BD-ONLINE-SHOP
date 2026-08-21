import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

// Config persistence paths
const DB_CONFIG_FILE = path.join(process.cwd(), 'data', 'db_config.json');
const FILE_DB_PATH = path.join(process.cwd(), 'data', 'tazu_mart_db.json');

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}

let activeDbConfig: DbConfig = {
  host: process.env.DB_HOST || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'tazu_mart_db',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true'
};

let mysqlPool: mysql.Pool | null = null;
let isMysqlConnected = false;
let lastDbError: string | null = null;

const VALID_COLUMNS_BY_TABLE: Record<string, string[]> = {
  categories: [
    'id', 'name', 'name_bn', 'slug', 'banner_name', 'banner_image', 'banner_images', 
    'gallery_images', 'icon_image', 'wide_banner_image', 'image_url', 'image', 
    'button_text', 'button_link', 'featured_products', 'description', 'display_order', 
    'status', 'show_on_homepage', 'homepage_visibility', 'slider_settings', 
    'meta_title', 'meta_description', 'keywords', 'created_at', 'updated_at'
  ],
  banners: [
    'id', 'name', 'title', 'image', 'image_url', 'banner_image_url', 'mobile_image_url', 
    'desktop_image_url', 'banner_size', 'banner_type', 'banner_category', 'category_id', 
    'connected_category_id', 'original_width', 'original_height', 'button_enabled', 
    'button_text', 'button_link', 'button_type', 'connected_product_id', 'locations', 
    'order', 'display_order', 'status', 'is_active', 'description', 'offer_text', 
    'created_date', 'created_at', 'updated_at'
  ],
  products: [
    'id', 'name', 'slug', 'price', 'discount_price', 'stock', 'image', 'image_url', 
    'featured_image', 'category', 'status', 'is_new', 'is_flash_sale', 'is_trending', 
    'is_best_selling', 'is_offer', 'rating', 'reviews', 'sold_count', 'reward_coins', 
    'coin_enabled', 'description', 'created_at', 'updated_at'
  ],
  settings: ['id', 'value', 'created_at', 'updated_at']
};

// Dynamic cache of confirmed live columns per table
const liveTableColumns = new Map<string, Set<string>>();

export async function fetchLiveTableColumns(tableName: string): Promise<Set<string>> {
  if (liveTableColumns.has(tableName) && (liveTableColumns.get(tableName)?.size || 0) > 0) {
    return liveTableColumns.get(tableName)!;
  }

  if (mysqlPool && isMysqlConnected) {
    try {
      const [rows]: any = await executeWithTimeout(`DESCRIBE \`${tableName}\``, [], 4000);
      if (Array.isArray(rows)) {
        const colSet = new Set<string>(rows.map((r: any) => r.Field));
        liveTableColumns.set(tableName, colSet);
        return colSet;
      }
    } catch (e) {
      // Fallback
    }
  }

  const defaultCols = VALID_COLUMNS_BY_TABLE[tableName] || [];
  const colSet = new Set<string>(defaultCols);
  liveTableColumns.set(tableName, colSet);
  return colSet;
}

export function prunePayloadForTable(tableName: string, data: Record<string, any>): Record<string, any> {
  const cachedSet = liveTableColumns.get(tableName);
  const allowedCols = cachedSet && cachedSet.size > 0 ? cachedSet : new Set(VALID_COLUMNS_BY_TABLE[tableName] || Object.keys(data));
  
  const pruned: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (allowedCols.has(key)) {
      pruned[key] = data[key];
    }
  }
  return pruned;
}

// Initialize config from saved file if available
async function loadSavedDbConfig(): Promise<void> {
  try {
    const raw = await fs.readFile(DB_CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.host && parsed.user) {
      activeDbConfig = { ...activeDbConfig, ...parsed };
      console.log(`[MySQL Engine] Loaded saved Hostinger database config for ${activeDbConfig.host}/${activeDbConfig.database}`);
    }
  } catch {
    // No saved config file yet, use env defaults
  }
}

// Auto-bootstrap MySQL Tables and Schema
async function initMysqlSchema(pool: mysql.Pool) {
  try {
    const conn = await pool.getConnection();
    try {
      // 1. Categories Table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`categories\` (
          \`id\` VARCHAR(191) PRIMARY KEY,
          \`name\` VARCHAR(255) NOT NULL,
          \`name_bn\` VARCHAR(255) DEFAULT NULL,
          \`slug\` VARCHAR(255) DEFAULT NULL,
          \`banner_name\` VARCHAR(255) DEFAULT NULL,
          \`banner_image\` LONGTEXT DEFAULT NULL,
          \`banner_images\` LONGTEXT DEFAULT NULL,
          \`gallery_images\` LONGTEXT DEFAULT NULL,
          \`icon_image\` LONGTEXT DEFAULT NULL,
          \`wide_banner_image\` LONGTEXT DEFAULT NULL,
          \`image_url\` LONGTEXT DEFAULT NULL,
          \`image\` LONGTEXT DEFAULT NULL,
          \`button_text\` VARCHAR(255) DEFAULT NULL,
          \`button_link\` VARCHAR(255) DEFAULT NULL,
          \`featured_products\` LONGTEXT DEFAULT NULL,
          \`description\` LONGTEXT DEFAULT NULL,
          \`display_order\` INT DEFAULT 1,
          \`status\` VARCHAR(50) DEFAULT 'Active',
          \`show_on_homepage\` TINYINT(1) DEFAULT 1,
          \`homepage_visibility\` TINYINT(1) DEFAULT 1,
          \`slider_settings\` LONGTEXT DEFAULT NULL,
          \`meta_title\` VARCHAR(255) DEFAULT NULL,
          \`meta_description\` LONGTEXT DEFAULT NULL,
          \`keywords\` LONGTEXT DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Ensure any missing columns exist on categories table for Hostinger MySQL compatibility
      try { await conn.query("ALTER TABLE `categories` ADD COLUMN `image_url` LONGTEXT DEFAULT NULL"); } catch (e) {}
      try { await conn.query("ALTER TABLE `categories` ADD COLUMN `image` LONGTEXT DEFAULT NULL"); } catch (e) {}
      try { await conn.query("ALTER TABLE `categories` ADD COLUMN `banner_image` LONGTEXT DEFAULT NULL"); } catch (e) {}
      try { await conn.query("ALTER TABLE `categories` ADD COLUMN `banner_images` LONGTEXT DEFAULT NULL"); } catch (e) {}
      try { await conn.query("ALTER TABLE `categories` ADD COLUMN `gallery_images` LONGTEXT DEFAULT NULL"); } catch (e) {}
      try { await conn.query("ALTER TABLE `categories` ADD COLUMN `icon_image` LONGTEXT DEFAULT NULL"); } catch (e) {}
      try { await conn.query("ALTER TABLE `categories` ADD COLUMN `wide_banner_image` LONGTEXT DEFAULT NULL"); } catch (e) {}

      // 2. Banners Table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`banners\` (
          \`id\` VARCHAR(191) PRIMARY KEY,
          \`name\` VARCHAR(255) DEFAULT NULL,
          \`title\` VARCHAR(255) DEFAULT NULL,
          \`image\` LONGTEXT DEFAULT NULL,
          \`image_url\` LONGTEXT DEFAULT NULL,
          \`banner_image_url\` LONGTEXT DEFAULT NULL,
          \`mobile_image_url\` LONGTEXT DEFAULT NULL,
          \`desktop_image_url\` LONGTEXT DEFAULT NULL,
          \`banner_size\` VARCHAR(50) DEFAULT 'hero',
          \`banner_type\` VARCHAR(50) DEFAULT 'main_banner',
          \`banner_category\` VARCHAR(50) DEFAULT 'main_banner',
          \`category_id\` VARCHAR(191) DEFAULT NULL,
          \`connected_category_id\` VARCHAR(191) DEFAULT NULL,
          \`original_width\` INT DEFAULT NULL,
          \`original_height\` INT DEFAULT NULL,
          \`button_enabled\` VARCHAR(10) DEFAULT 'false',
          \`button_text\` VARCHAR(255) DEFAULT NULL,
          \`button_link\` VARCHAR(255) DEFAULT NULL,
          \`button_type\` VARCHAR(50) DEFAULT NULL,
          \`connected_product_id\` VARCHAR(191) DEFAULT NULL,
          \`locations\` LONGTEXT DEFAULT NULL,
          \`order\` VARCHAR(50) DEFAULT '0',
          \`display_order\` INT DEFAULT 0,
          \`status\` VARCHAR(50) DEFAULT 'active',
          \`is_active\` TINYINT(1) DEFAULT 1,
          \`description\` LONGTEXT DEFAULT NULL,
          \`offer_text\` VARCHAR(255) DEFAULT NULL,
          \`created_date\` VARCHAR(100) DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Products Table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`products\` (
          \`id\` VARCHAR(191) PRIMARY KEY,
          \`name\` VARCHAR(255) NOT NULL,
          \`slug\` VARCHAR(255) DEFAULT NULL,
          \`price\` DECIMAL(10,2) DEFAULT 0,
          \`discount_price\` DECIMAL(10,2) DEFAULT NULL,
          \`stock\` INT DEFAULT 0,
          \`image\` LONGTEXT DEFAULT NULL,
          \`image_url\` LONGTEXT DEFAULT NULL,
          \`featured_image\` LONGTEXT DEFAULT NULL,
          \`category\` VARCHAR(255) DEFAULT NULL,
          \`status\` VARCHAR(50) DEFAULT 'active',
          \`is_new\` TINYINT(1) DEFAULT 0,
          \`is_flash_sale\` TINYINT(1) DEFAULT 0,
          \`is_trending\` TINYINT(1) DEFAULT 0,
          \`is_best_selling\` TINYINT(1) DEFAULT 0,
          \`is_offer\` TINYINT(1) DEFAULT 0,
          \`rating\` DECIMAL(3,2) DEFAULT 5.0,
          \`reviews\` INT DEFAULT 0,
          \`sold_count\` INT DEFAULT 0,
          \`reward_coins\` INT DEFAULT 0,
          \`coin_enabled\` TINYINT(1) DEFAULT 0,
          \`description\` LONGTEXT DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Settings Table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`settings\` (
          \`id\` VARCHAR(191) PRIMARY KEY,
          \`value\` LONGTEXT DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      console.log("[MySQL Engine] Hostinger MySQL tables verified and initialized successfully.");
      isMysqlConnected = true;
      lastDbError = null;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.warn("[MySQL Engine] Schema init notice:", err.message);
    lastDbError = err.message;
  }
}

// Connect or reconnect to MySQL
export async function setupMysqlPool(config?: DbConfig): Promise<{ success: boolean; message: string }> {
  try {
    if (mysqlPool) {
      await mysqlPool.end().catch(() => {});
      mysqlPool = null;
      isMysqlConnected = false;
    }

    if (!config) {
      await loadSavedDbConfig();
      config = activeDbConfig;
    }

    if (!config || !config.host || !config.user) {
      return { success: false, message: 'Host and username are required' };
    }

    const cleanHost = config.host.trim().replace(/^https?:\/\//i, '').split('/')[0];
    config.host = cleanHost;

    const poolOptions: mysql.PoolOptions = {
      host: cleanHost,
      port: config.port || 3306,
      database: config.database || 'tazu_mart_db',
      user: config.user,
      password: config.password || '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 8000,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined
    };

    const newPool = mysql.createPool(poolOptions);
    // Test the connection immediately
    const conn = await newPool.getConnection();
    await conn.ping();
    conn.release();

    mysqlPool = newPool;
    isMysqlConnected = true;
    activeDbConfig = config;
    lastDbError = null;

    // Save config to file
    await fs.mkdir(path.dirname(DB_CONFIG_FILE), { recursive: true });
    await fs.writeFile(DB_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

    // Bootstrap schema in background
    initMysqlSchema(newPool).catch(() => {});

    console.log(`[MySQL Engine] Connected successfully to Hostinger MySQL (${config.host}:${config.port}/${config.database})`);
    return { success: true, message: `Connected successfully to Hostinger MySQL (${config.host})` };
  } catch (err: any) {
    console.warn(`[MySQL Engine] Connection failed to ${config.host}:`, err.message);
    isMysqlConnected = false;
    lastDbError = err.message;
    return { success: false, message: err.message || 'Connection failed' };
  }
}

// Initial boot initialization
loadSavedDbConfig().then(() => {
  if (activeDbConfig.host && activeDbConfig.user) {
    setupMysqlPool(activeDbConfig).catch(() => {});
  }
});

// Health Check Helper
export const checkDbHealth = async (): Promise<{
  status: 'ok' | 'degraded' | 'error';
  mode: 'mysql' | 'file_fallback';
  database: string;
  host: string;
  user: string;
  latencyMs?: number;
  isMysqlConnected: boolean;
  message: string;
  error?: string | null;
}> => {
  const startTime = Date.now();
  if (mysqlPool) {
    try {
      const conn = await mysqlPool.getConnection();
      await conn.ping();
      conn.release();
      const latencyMs = Date.now() - startTime;
      isMysqlConnected = true;
      lastDbError = null;
      return {
        status: 'ok',
        mode: 'mysql',
        database: activeDbConfig.database || 'tazu_mart_db',
        host: activeDbConfig.host || 'unknown',
        user: activeDbConfig.user || 'root',
        latencyMs,
        isMysqlConnected: true,
        message: 'Hostinger MySQL database connection healthy',
        error: null
      };
    } catch (err: any) {
      isMysqlConnected = false;
      lastDbError = err.message;
      return {
        status: 'degraded',
        mode: 'file_fallback',
        database: activeDbConfig.database || 'tazu_mart_db',
        host: activeDbConfig.host || 'unknown',
        user: activeDbConfig.user || 'root',
        isMysqlConnected: false,
        message: `Hostinger MySQL (${activeDbConfig.host}) offline. Operating on local container database.`,
        error: err.message
      };
    }
  }

  return {
    status: 'ok',
    mode: 'file_fallback',
    database: activeDbConfig.database || 'tazu_mart_db',
    host: activeDbConfig.host || 'Local Storage',
    user: activeDbConfig.user || 'admin',
    isMysqlConnected: false,
    message: 'Local storage database active. Connect your Hostinger MySQL in Database Settings.',
    error: lastDbError
  };
};

export async function ensureFileDb(): Promise<any> {
  try {
    await fs.mkdir(path.dirname(FILE_DB_PATH), { recursive: true });
    const content = await fs.readFile(FILE_DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    const initialDb = {
      products: [],
      categories: [],
      orders: [],
      customers: [],
      users: [],
      banners: [],
      reviews: [],
      settings: [],
      offers: [],
      campaigns: []
    };
    await fs.writeFile(FILE_DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }
}

export async function saveFileDb(dbData: any): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE_DB_PATH), { recursive: true });
    await fs.writeFile(FILE_DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.error("[File DB Error] Failed to persist data:", err);
  }
}

// Helper to execute MySQL with timeout to prevent hanging on Hostinger
const executeWithTimeout = async (sql: string, params: any[] = [], timeoutMs: number = 15000): Promise<any> => {
  if (!mysqlPool || !isMysqlConnected) throw new Error("MySQL not connected");
  
  return Promise.race([
    mysqlPool.execute(sql, params),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`MySQL Query Timeout after ${timeoutMs}ms`)), timeoutMs))
  ]);
};

// Universal Query Helper
export const query = async (sql: string, params: any[] = []): Promise<any> => {
  if (mysqlPool && isMysqlConnected) {
    try {
      const [rows] = await executeWithTimeout(sql, params);
      return rows;
    } catch (mysqlErr) {
      console.warn("[MySQL Query Error, using local store]:", mysqlErr);
    }
  }

  const dbData = await ensureFileDb();
  const lowerSql = sql.toLowerCase().trim();

  let tableName = 'products';
  if (lowerSql.includes('categories')) tableName = 'categories';
  else if (lowerSql.includes('orders')) tableName = 'orders';
  else if (lowerSql.includes('customers')) tableName = 'customers';
  else if (lowerSql.includes('users')) tableName = 'users';
  else if (lowerSql.includes('banners')) tableName = 'banners';
  else if (lowerSql.includes('reviews')) tableName = 'reviews';
  else if (lowerSql.includes('settings')) tableName = 'settings';
  else if (lowerSql.includes('offers')) tableName = 'offers';
  else if (lowerSql.includes('campaigns')) tableName = 'campaigns';

  let list = dbData[tableName] || [];
  if (params.length > 0 && (lowerSql.includes('where id =') || lowerSql.includes('where slug ='))) {
    const matchVal = params[0];
    list = list.filter((item: any) => item.id === matchVal || item.slug === matchVal);
  }
  return list;
};

// Select Items
export const dbSelect = async (tableName: string, whereClause: string = '', params: any[] = []): Promise<any[]> => {
  if (mysqlPool && isMysqlConnected) {
    try {
      let sql = `SELECT * FROM \`${tableName}\``;
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
      const [rows] = await executeWithTimeout(sql, params);
      if (Array.isArray(rows)) {
        return rows;
      }
    } catch (err: any) {
      console.warn(`[MySQL Select notice for ${tableName}, falling back to local data]:`, err.message);
    }
  }

  const dbData = await ensureFileDb();
  let list = dbData[tableName] || [];
  if (params.length > 0 && whereClause) {
    list = list.filter((item: any) => {
      return params.every((p: any) => Object.values(item).includes(p));
    });
  }
  return list;
};

// Insert Item - ALWAYS SAVES TO LOCAL DB FIRST, NEVER THROWS ON NETWORK ERROR
export const dbInsert = async (tableName: string, data: Record<string, any>): Promise<any> => {
  // 1. Always update local file DB first as authoritative guarantee
  const dbData = await ensureFileDb();
  if (!dbData[tableName]) dbData[tableName] = [];
  
  const existingIdx = dbData[tableName].findIndex((i: any) => i.id === data.id);
  if (existingIdx >= 0) {
    dbData[tableName][existingIdx] = { ...dbData[tableName][existingIdx], ...data };
  } else {
    dbData[tableName].unshift(data);
  }
  await saveFileDb(dbData);

  // 2. Then if MySQL is connected, insert/upsert to MySQL with self-healing retry
  if (mysqlPool && isMysqlConnected) {
    await fetchLiveTableColumns(tableName);
    let currentPayload = { ...data };
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      retries++;
      try {
        const prunedData = prunePayloadForTable(tableName, currentPayload);
        const keys = Object.keys(prunedData).filter(k => prunedData[k] !== undefined);
        if (keys.length === 0) break;

        const fields = keys.map(k => `\`${k}\``).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => {
          const val = prunedData[k];
          if (typeof val === 'object' && val !== null) return JSON.stringify(val);
          if (typeof val === 'boolean') return val ? 1 : 0;
          return val;
        });
        const updateClause = keys
          .filter(k => k !== 'id' && k !== 'created_at')
          .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
          .join(', ');

        const sql = `INSERT INTO \`${tableName}\` (${fields}) VALUES (${placeholders}) ${
          updateClause ? `ON DUPLICATE KEY UPDATE ${updateClause}` : ''
        }`;
        const [res] = await executeWithTimeout(sql, values);
        return res;
      } catch (err: any) {
        const errMsg = err.message || String(err);
        const unknownColMatch = errMsg.match(/Unknown column '([^']+)'/i);
        if (unknownColMatch && unknownColMatch[1]) {
          const badCol = unknownColMatch[1];
          console.warn(`[MySQL Auto-Healing] Column '${badCol}' missing in '${tableName}', pruning and retrying...`);
          const cachedCols = liveTableColumns.get(tableName);
          if (cachedCols) cachedCols.delete(badCol);
          delete currentPayload[badCol];
          continue;
        }
        console.warn(`[MySQL Insert notice on ${tableName}]:`, errMsg);
        break;
      }
    }
  }

  return { affectedRows: 1 };
};

// Update Item
export const dbUpdate = async (tableName: string, arg2: any, arg3: any, arg4?: any): Promise<any> => {
  let data: Record<string, any> = {};
  let whereCol = 'id';
  let whereVal: any = undefined;

  if (typeof arg2 === 'string' || typeof arg2 === 'number') {
    whereVal = arg2;
    data = arg3 || {};
  } else {
    data = arg2 || {};
    if (arg4 !== undefined) {
      whereCol = arg3 || 'id';
      whereVal = arg4;
    } else {
      whereVal = arg3;
    }
  }

  // 1. Update local file DB
  const dbData = await ensureFileDb();
  if (dbData[tableName]) {
    dbData[tableName] = dbData[tableName].map((i: any) => {
      if (i[whereCol] === whereVal || i.id === whereVal) {
        return { ...i, ...data };
      }
      return i;
    });
    await saveFileDb(dbData);
  }

  // 2. Update MySQL with self-healing retry
  if (mysqlPool && isMysqlConnected) {
    await fetchLiveTableColumns(tableName);
    let currentPayload = { ...data };
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      retries++;
      try {
        const prunedData = prunePayloadForTable(tableName, currentPayload);
        const keys = Object.keys(prunedData).filter(k => prunedData[k] !== undefined && k !== 'id' && k !== 'created_at');
        if (keys.length === 0) break;

        const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
        const values = keys.map(k => {
          const val = prunedData[k];
          if (typeof val === 'object' && val !== null) return JSON.stringify(val);
          if (typeof val === 'boolean') return val ? 1 : 0;
          return val;
        });
        values.push(whereVal);
        const sql = `UPDATE \`${tableName}\` SET ${setClause} WHERE \`${whereCol}\` = ?`;
        const [res] = await executeWithTimeout(sql, values);
        return res;
      } catch (err: any) {
        const errMsg = err.message || String(err);
        const unknownColMatch = errMsg.match(/Unknown column '([^']+)'/i);
        if (unknownColMatch && unknownColMatch[1]) {
          const badCol = unknownColMatch[1];
          console.warn(`[MySQL Auto-Healing Update] Column '${badCol}' missing in '${tableName}', pruning and retrying...`);
          const cachedCols = liveTableColumns.get(tableName);
          if (cachedCols) cachedCols.delete(badCol);
          delete currentPayload[badCol];
          continue;
        }
        console.warn(`[MySQL Update notice on ${tableName}]:`, errMsg);
        break;
      }
    }
  }

  return { affectedRows: 1 };
};

// Delete Item
export const dbDelete = async (tableName: string, arg2: any, arg3?: any): Promise<any> => {
  let whereCol = 'id';
  let whereVal: any = undefined;

  if (arg3 !== undefined) {
    whereCol = arg2;
    whereVal = arg3;
  } else {
    whereVal = arg2;
  }

  // 1. Delete from local file DB
  const dbData = await ensureFileDb();
  if (dbData[tableName]) {
    dbData[tableName] = dbData[tableName].filter((i: any) => i[whereCol] !== whereVal && i.id !== whereVal);
    await saveFileDb(dbData);
  }

  // 2. Delete from MySQL
  if (mysqlPool && isMysqlConnected) {
    try {
      const sql = `DELETE FROM \`${tableName}\` WHERE \`${whereCol}\` = ?`;
      const [res] = await executeWithTimeout(sql, [whereVal]);
      return res;
    } catch (err: any) {
      console.warn(`[MySQL Delete notice on ${tableName}]:`, err.message || err);
    }
  }

  return { affectedRows: 1 };
};

// Sync all local database collections directly into Hostinger MySQL
export async function syncLocalDbToMysql(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  if (!mysqlPool || !isMysqlConnected) {
    return { success: false, syncedCount: 0, errors: ['MySQL database is not connected'] };
  }

  const errors: string[] = [];
  let syncedCount = 0;
  const dbData = await ensureFileDb();

  const tables = ['categories', 'banners', 'products', 'settings', 'reviews', 'offers', 'campaigns'];

  for (const table of tables) {
    const items = dbData[table] || [];
    for (const item of items) {
      try {
        const prunedItem = prunePayloadForTable(table, item);
        const keys = Object.keys(prunedItem).filter(k => prunedItem[k] !== undefined);
        if (keys.length === 0) continue;
        const fields = keys.map(k => `\`${k}\``).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => {
          const val = prunedItem[k];
          if (typeof val === 'object' && val !== null) return JSON.stringify(val);
          if (typeof val === 'boolean') return val ? 1 : 0;
          return val;
        });
        const sql = `REPLACE INTO \`${table}\` (${fields}) VALUES (${placeholders})`;
        await executeWithTimeout(sql, values, 5000); // Faster timeout for sync
        syncedCount++;
      } catch (err: any) {
        errors.push(`Failed to sync ${table} item ${item.id}: ${err.message}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    syncedCount,
    errors
  };
}

export default {
  query,
  dbSelect,
  dbInsert,
  dbUpdate,
  dbDelete,
  checkDbHealth,
  setupMysqlPool,
  syncLocalDbToMysql
};
