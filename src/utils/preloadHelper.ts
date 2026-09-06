import { useCategoryStore, mapDbToCategory } from '../store/useCategoryStore';
import { useProductStore } from '../store/useProductStore';
import { useBannerStore } from '../store/useBannerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useReviewStore } from '../store/useReviewStore';
import { useOfferStore } from '../store/useOfferStore';
import { 
  INITIAL_SUPABASE_CATEGORIES, 
  INITIAL_SUPABASE_BANNERS, 
  INITIAL_SUPABASE_PRODUCTS, 
  INITIAL_SUPABASE_SETTINGS 
} from '../data/initialSupabaseData';

function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
}

export function objectToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => objectToCamel(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [toCamelCase(key)]: objectToCamel(obj[key]),
      }),
      {}
    );
  }
  return obj;
}

export function mapDbToBanner(row: any): any {
  const camel = objectToCamel(row);
  return {
    ...camel,
    id: camel.id || row.id,
    name: camel.name || row.name || 'Banner',
    status: (camel.status || row.status || 'active').toLowerCase(),
    image: camel.image || row.image || camel.imageUrl || row.image_url || '',
    imageUrl: camel.imageUrl || row.image_url || camel.image || row.image || '',
    order: Number(camel.order ?? row.order ?? camel.displayOrder ?? row.display_order ?? 0),
    bannerType: camel.bannerType || row.banner_type || 'main_banner',
    bannerCategory: camel.bannerCategory || row.banner_category || 'main_banner'
  };
}

export function mapDbToProduct(row: any): any {
  const camelRow: any = objectToCamel(row);

  let parsedImages: string[] = [];
  if (Array.isArray(camelRow.images)) {
    parsedImages = camelRow.images;
  } else if (typeof camelRow.images === 'string') {
    const trimmed = camelRow.images.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsedImages = parsed;
        } else {
          parsedImages = [trimmed];
        }
      } catch {
        parsedImages = trimmed.split(',').map((img: string) => img.trim()).filter(Boolean);
      }
    } else {
      parsedImages = trimmed.split(',').map((img: string) => img.trim()).filter(Boolean);
    }
  } else if (camelRow.images) {
    parsedImages = [String(camelRow.images)];
  }

  let parsedSeoPoints: string[] = [];
  if (Array.isArray(camelRow.seoPoints)) {
    parsedSeoPoints = camelRow.seoPoints;
  } else if (typeof camelRow.seoPoints === 'string') {
    const trimmed = camelRow.seoPoints.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsedSeoPoints = parsed;
        } else {
          parsedSeoPoints = [trimmed];
        }
      } catch {
        parsedSeoPoints = trimmed.split(',').map((p: string) => p.trim()).filter(Boolean);
      }
    } else {
      parsedSeoPoints = trimmed.split(',').map((p: string) => p.trim()).filter(Boolean);
    }
  } else if (camelRow.seoPoints) {
    parsedSeoPoints = [String(camelRow.seoPoints)];
  }

  let parsedVariants: any[] = [];
  if (Array.isArray(camelRow.variants)) {
    parsedVariants = camelRow.variants;
  } else if (typeof camelRow.variants === 'string') {
    const trimmed = camelRow.variants.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        parsedVariants = JSON.parse(trimmed);
      } catch {}
    }
  }

  let parsedShippingZones: any[] = [];
  if (Array.isArray(camelRow.shippingZones)) {
    parsedShippingZones = camelRow.shippingZones;
  } else if (typeof camelRow.shippingZones === 'string') {
    const trimmed = camelRow.shippingZones.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        parsedShippingZones = JSON.parse(trimmed);
      } catch {}
    }
  }

  let parsedKeywords: string[] = [];
  if (Array.isArray(camelRow.keywords)) {
    parsedKeywords = camelRow.keywords;
  } else if (typeof camelRow.keywords === 'string') {
    const trimmed = camelRow.keywords.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsedKeywords = parsed;
        } else {
          parsedKeywords = [trimmed];
        }
      } catch {
        parsedKeywords = trimmed.split(',').map((p: string) => p.trim()).filter(Boolean);
      }
    } else {
      parsedKeywords = trimmed.split(',').map((p: string) => p.trim()).filter(Boolean);
    }
  } else if (camelRow.keywords) {
    parsedKeywords = [String(camelRow.keywords)];
  }

  return {
    ...camelRow,
    id: camelRow.id || '',
    name: camelRow.name || '',
    sku: camelRow.sku || camelRow.skuCode || '',
    sku_code: camelRow.skuCode || camelRow.sku || '',
    category: camelRow.category || '',
    price: Number(camelRow.price || 0),
    discountPrice: camelRow.discountPrice,
    stock: Number(camelRow.stock || 0),
    image: camelRow.image || camelRow.imageUrl || camelRow.featuredImage || '',
    imageUrl: camelRow.imageUrl || camelRow.image || '',
    featured_image: camelRow.featuredImage || camelRow.image || '',
    banner_image: camelRow.bannerImage || '',
    images: parsedImages,
    videoUrl: camelRow.videoUrl || camelRow.mediaUrl || '',
    mediaUrl: camelRow.mediaUrl || camelRow.videoUrl || '',
    rating: Number(camelRow.rating || 4.5),
    reviews: Number(camelRow.reviews || 0),
    isNew: camelRow.isNew !== undefined ? camelRow.isNew : true,
    brand: camelRow.brand || '',
    status: (camelRow.status || 'active').toLowerCase(),
    description: camelRow.description || '',
    createdAt: camelRow.createdAt || Date.now(),
    buyingPrice: camelRow.buyingPrice,
    warranty: camelRow.warranty || '',
    unitName: camelRow.unitName,
    soldCount: Number(camelRow.soldCount || 0),
    productCode: camelRow.productCode || '',
    seoPoints: parsedSeoPoints,
    variants: parsedVariants,
    shippingZones: parsedShippingZones,
    is_flash_sale: Boolean(camelRow.isFlashSale ?? (row && row.is_flash_sale) ?? camelRow.is_flash_sale),
    is_trending: Boolean(camelRow.isTrending ?? (row && row.is_trending) ?? camelRow.is_trending),
    is_best_selling: Boolean(camelRow.isBestSelling ?? (row && row.is_best_selling) ?? camelRow.is_best_selling),
    is_regular: Boolean(camelRow.isRegular ?? (row && row.is_regular) ?? camelRow.is_regular),
    is_offer: Boolean(camelRow.isOffer ?? (row && row.is_offer) ?? camelRow.is_offer),
    reward_coins: camelRow.rewardCoins,
    coin_enabled: camelRow.coinEnabled,
    isDemo: !!camelRow.isDemo,
    keywords: parsedKeywords
  };
}

export function mapDbToReview(r: any): any {
  return {
    reviewId: r.id,
    productId: r.product_id,
    customerId: r.user_id,
    customerName: r.customer_name,
    rating: r.rating,
    reviewText: r.review_text,
    mediaUrls: r.media_urls || [],
    adminReply: r.admin_reply,
    status: r.status,
    verified: r.verified,
    createdAt: r.created_at,
    phone: r.phone,
    email: r.email,
    orderId: r.order_id,
    deviceIP: r.device_ip,
    anonymous: r.anonymous,
    isPinned: r.is_pinned,
    rejectionReason: r.rejection_reason
  };
}

export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!url) {
      resolve();
      return;
    }
    const img = new Image();
    
    const timeoutId = setTimeout(() => {
      resolve();
    }, 1500);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(); // Resolve anyway so we don't block app rendering
    };
    
    img.src = url;
  });
}

let inflightPreload: Promise<void> | null = null;

export async function preloadHomepageDataAndAssets(): Promise<void> {
  if (inflightPreload) return inflightPreload;

  inflightPreload = (async () => {
    try {
      const res = await fetch('/api/homepage-data');
      if (!res.ok) throw new Error("Failed to fetch homepage data");
      const data = await res.json();

      // Store the global database error for UI messaging/diagnostics
      if (typeof window !== 'undefined') {
        (window as any).__SUPABASE_DB_ERROR = data.dbError;
      }

      // 1. Map data to client models
      const rawBanners = (data.banners || []).map(mapDbToBanner);
      const rawCategories = (data.categories || []).map(mapDbToCategory);
      const rawProducts = (data.products || []).map(mapDbToProduct);
      const reviews = (data.reviews || []).map(mapDbToReview);
      const offers = (data.offers || []);

      const banners = rawBanners.length > 0 ? rawBanners : (useBannerStore.getState().banners.length > 0 ? useBannerStore.getState().banners : INITIAL_SUPABASE_BANNERS);
      const categories = rawCategories.length > 0 ? rawCategories : (useCategoryStore.getState().categories.length > 0 ? useCategoryStore.getState().categories : INITIAL_SUPABASE_CATEGORIES);
      const products = rawProducts.length > 0 ? rawProducts : (useProductStore.getState().products.length > 0 ? useProductStore.getState().products : INITIAL_SUPABASE_PRODUCTS);

      // 2. Load settings across all setting rows (especially general and banner config)
      let settings: any = { ...INITIAL_SUPABASE_SETTINGS };
      if (data.settings && Array.isArray(data.settings)) {
        for (const row of data.settings) {
          if (!row) continue;
          if (row.value) {
            try {
              const parsedValue = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
              if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
                settings = { ...settings, ...objectToCamel(parsedValue) };
              }
            } catch {
              settings = { ...settings, ...objectToCamel(row) };
            }
          } else {
            settings = { ...settings, ...objectToCamel(row) };
          }
        }
      }

      // 3. Populate all stores synchronously together in one atomic phase
      useBannerStore.setState({ banners, isLoaded: true });
      useCategoryStore.setState({ categories, isLoaded: true });
      useProductStore.setState({ products, isLoaded: true, isLoading: false });
      useReviewStore.setState({ reviews, isLoading: false });
      if (offers && offers.length > 0) {
        useOfferStore.setState({ offers, isLoaded: true });
      } else {
        useOfferStore.setState({ isLoaded: true });
      }
      useSettingsStore.setState({ 
        settings: { 
          ...useSettingsStore.getState().settings, 
          ...settings,
          flashSaleEnabled: true 
        }, 
        isLoaded: true 
      });

      // Save to local caches so subsequent views are instant from store initializer
      try {
        localStorage.setItem('db_cached_banners', JSON.stringify(banners));
        localStorage.setItem('db_cached_categories', JSON.stringify(categories));
        localStorage.setItem('db_cached_products', JSON.stringify(products));
        localStorage.setItem('db_cached_offers', JSON.stringify(offers));
        localStorage.setItem('cached_banners', JSON.stringify(banners));
        localStorage.setItem('cached_categories', JSON.stringify(categories));
        localStorage.setItem('cached_products', JSON.stringify(products));
      } catch (e) {
        console.warn("Failed to save homepage data to localStorage cache (quota likely exceeded):", e);
      }

      // 4. Extract first image resources for background asset preloading (above the fold)
      const imagesToPreload: string[] = [];

      // First banner
      const firstBanner = banners.find((b: any) => b.placement === 'Slider' || b.placement === 'slider' || b.status === 'active');
      if (firstBanner && (firstBanner.imageUrl || firstBanner.image)) {
        imagesToPreload.push(firstBanner.imageUrl || firstBanner.image);
      }

      // First 6 category thumbnail images
      categories.slice(0, 6).forEach((cat: any) => {
        const img = cat.iconImage || cat.bannerImage;
        if (img) imagesToPreload.push(img);
      });

      // First 4 products
      products.slice(0, 4).forEach((prod: any) => {
        const img = prod.image || prod.imageUrl || (prod.images && prod.images[0]);
        if (img) imagesToPreload.push(img);
      });

      // Run preload on images in parallel without blocking
      Promise.all(imagesToPreload.map(url => preloadImage(url))).catch(() => {});
    } catch (error) {
      console.error("Error preloading homepage data and assets:", error);
    } finally {
      inflightPreload = null;
    }
  })();

  return inflightPreload;
}
