-- TAZU MART BD - MySQL Database Schema
-- Compatible with Hostinger MySQL / MariaDB

SET FOREIGN_KEY_CHECKS = 0;

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  sku VARCHAR(128),
  category VARCHAR(128),
  price DECIMAL(10,2) DEFAULT 0.00,
  discount_price DECIMAL(10,2) DEFAULT NULL,
  stock INT DEFAULT 0,
  image TEXT,
  image_url TEXT,
  featured_image TEXT,
  banner_image TEXT,
  images TEXT,
  video_url TEXT,
  media_url TEXT,
  rating DECIMAL(3,2) DEFAULT 5.00,
  reviews INT DEFAULT 0,
  is_new TINYINT(1) DEFAULT 1,
  brand VARCHAR(128) DEFAULT 'TAZU MART BD',
  status VARCHAR(32) DEFAULT 'Active',
  description LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  buying_price DECIMAL(10,2) DEFAULT 0.00,
  warranty VARCHAR(128),
  unit_name VARCHAR(64) DEFAULT 'Pcs',
  sold_count INT DEFAULT 0,
  seo_points TEXT,
  variants LONGTEXT,
  shipping_zones LONGTEXT,
  is_flash_sale TINYINT(1) DEFAULT 0,
  is_trending TINYINT(1) DEFAULT 0,
  is_best_selling TINYINT(1) DEFAULT 0,
  is_regular TINYINT(1) DEFAULT 1,
  is_offer TINYINT(1) DEFAULT 0,
  reward_coins INT DEFAULT 0,
  coin_enabled TINYINT(1) DEFAULT 0,
  is_demo TINYINT(1) DEFAULT 0,
  keywords TEXT,
  display_order INT DEFAULT 0,
  thumbnail TEXT,
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  banner_name VARCHAR(255),
  banner_image TEXT,
  icon_image TEXT,
  display_order INT DEFAULT 0,
  status VARCHAR(32) DEFAULT 'Active',
  show_on_homepage TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(128) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(64) NOT NULL,
  alternative_phone VARCHAR(64),
  shipping_address TEXT,
  district VARCHAR(128),
  sub_district VARCHAR(128),
  notes TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  delivery_charge DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  payment_method VARCHAR(64) DEFAULT 'Cash on Delivery',
  payment_status VARCHAR(32) DEFAULT 'Pending',
  order_status VARCHAR(32) DEFAULT 'Pending',
  courier_name VARCHAR(128),
  tracking_id VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  items LONGTEXT,
  customer_id VARCHAR(128),
  INDEX idx_order_status (order_status),
  INDEX idx_mobile (mobile_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CUSTOMERS / USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(64) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(32) DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32) DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CUSTOMERS PROFILES TABLE
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64),
  email VARCHAR(255),
  address TEXT,
  district VARCHAR(128),
  sub_district VARCHAR(128),
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32) DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BANNERS TABLE
CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255),
  image TEXT NOT NULL,
  offer_text TEXT,
  description TEXT,
  button_text VARCHAR(128) DEFAULT 'Shop Now',
  button_link TEXT,
  button_enabled TINYINT(1) DEFAULT 0,
  connected_product_id VARCHAR(128),
  locations TEXT,
  banner_size VARCHAR(64) DEFAULT 'hero',
  status VARCHAR(32) DEFAULT 'active',
  display_order INT DEFAULT 0,
  banner_type VARCHAR(64) DEFAULT 'main_banner',
  banner_category VARCHAR(64) DEFAULT 'main_banner',
  media_type VARCHAR(64) DEFAULT 'banner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(128) PRIMARY KEY,
  product_id VARCHAR(128) NOT NULL,
  user_id VARCHAR(128),
  customer_name VARCHAR(255) NOT NULL,
  rating DECIMAL(3,2) DEFAULT 5.00,
  review_text TEXT,
  status VARCHAR(32) DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_review_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(128) PRIMARY KEY,
  value LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. OFFERS TABLE
CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  discount_badge VARCHAR(128),
  button_text VARCHAR(128) DEFAULT 'Shop Now',
  button_link TEXT,
  image_url TEXT,
  type VARCHAR(64) DEFAULT 'flash_sale',
  priority INT DEFAULT 0,
  status VARCHAR(32) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  banner_url TEXT,
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  status VARCHAR(32) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
