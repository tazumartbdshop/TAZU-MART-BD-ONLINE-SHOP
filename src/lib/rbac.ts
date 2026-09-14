export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  category: 'Core' | 'Catalog & Sales' | 'Operations' | 'Marketing' | 'System';
  defaultPath: string;
  iconName?: string;
}

export const ADMIN_MODULES: PermissionModule[] = [
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    description: 'Access main revenue, order stats, live visitors radar, and executive summaries',
    category: 'Core',
    defaultPath: '/admin'
  },
  {
    id: 'orders',
    name: 'Orders Management',
    description: 'View orders, update delivery status, process invoices, handle returns & incomplete orders',
    category: 'Catalog & Sales',
    defaultPath: '/admin/orders'
  },
  {
    id: 'products',
    name: 'Products & Inventory',
    description: 'Add and edit products, update pricing, manage warehouse stock and variants',
    category: 'Catalog & Sales',
    defaultPath: '/admin/products'
  },
  {
    id: 'categories',
    name: 'Category Control',
    description: 'Create and organize catalog categories, subcategories, and visual badges',
    category: 'Catalog & Sales',
    defaultPath: '/admin/categories'
  },
  {
    id: 'users',
    name: 'Customer Management',
    description: 'View customer accounts, registration info, order history, and contact details',
    category: 'Operations',
    defaultPath: '/admin/customers'
  },
  {
    id: 'reviews',
    name: 'Reviews & Ratings',
    description: 'Inspect user reviews, manage star ratings, reply to feedback, and filter media',
    category: 'Operations',
    defaultPath: '/admin/reviews'
  },
  {
    id: 'banners',
    name: 'Banner Management',
    description: 'Upload and configure homepage carousels, mobile flutter banners, and brand showcases',
    category: 'Marketing',
    defaultPath: '/admin/banner/list'
  },
  {
    id: 'campaigns',
    name: 'Campaigns & Promos',
    description: 'Create flash sale events, discount promo codes, popup announcements, and push alerts',
    category: 'Marketing',
    defaultPath: '/admin/campaigns/history'
  },
  {
    id: 'marketing',
    name: 'Tracking & Pixels',
    description: 'Configure Facebook CAPI, TikTok Pixel, Google Analytics 4, and server-side tracking',
    category: 'Marketing',
    defaultPath: '/admin/marketing/tracking-overview'
  },
  {
    id: 'payments',
    name: 'Payment Methods',
    description: 'Manage personal payment gateways (bKash, Nagad, Rocket) and Merchant merchant credentials',
    category: 'Operations',
    defaultPath: '/admin/payments'
  },
  {
    id: 'delivery',
    name: 'Courier & Shipping',
    description: 'Setup Steadfast, Pathao, RedX courier API keys and area-based delivery charges',
    category: 'Operations',
    defaultPath: '/admin/delivery/courier-api'
  },
  {
    id: 'support',
    name: 'Customer Support & AI',
    description: 'Live chat inbox with customers, ticket escalations, and AI agent control',
    category: 'Operations',
    defaultPath: '/admin/support'
  },
  {
    id: 'analytics',
    name: 'Website & Server Analytics',
    description: 'Examine traffic sources, device breakdowns, search analytics, and server monitoring',
    category: 'System',
    defaultPath: '/admin/analytics'
  },
  {
    id: 'settings',
    name: 'Store Settings & Theme',
    description: 'Store identity, business address, theme colors, social links, and automation rules',
    category: 'System',
    defaultPath: '/admin/settings'
  },
  {
    id: 'roles',
    name: 'Staff & Role Management',
    description: 'Super Admin only: Create, edit, and revoke moderator and staff accounts',
    category: 'System',
    defaultPath: '/admin/management/moderators'
  }
];

export interface RolePreset {
  id: string;
  name: string;
  description: string;
  modules: string[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'full_access',
    name: '⚡ Full Access',
    description: 'All system modules unlocked (except Super Admin role management)',
    modules: [
      'dashboard',
      'orders',
      'products',
      'categories',
      'users',
      'reviews',
      'banners',
      'campaigns',
      'marketing',
      'payments',
      'delivery',
      'support',
      'analytics',
      'settings'
    ]
  },
  {
    id: 'order_manager',
    name: '📦 Order Manager',
    description: 'Manage order workflows, shipping couriers, and customer inquiries',
    modules: ['dashboard', 'orders', 'users', 'delivery']
  },
  {
    id: 'product_manager',
    name: '🛍️ Product Specialist',
    description: 'Full control over products, categories, stock, and product reviews',
    modules: ['dashboard', 'products', 'categories', 'reviews']
  },
  {
    id: 'content_marketing',
    name: '🎨 Content & Marketing',
    description: 'Manage promotional banners, campaigns, discount codes, and tracking',
    modules: ['dashboard', 'banners', 'campaigns', 'marketing']
  },
  {
    id: 'support_staff',
    name: '💬 Support & Reviews',
    description: 'Customer live chat support, reviews moderation, and customer tickets',
    modules: ['dashboard', 'support', 'reviews', 'users', 'orders']
  },
  {
    id: 'analytics_viewer',
    name: '📊 Analytics Viewer',
    description: 'Read-only access to sales metrics, visitor radar, and server logs',
    modules: ['dashboard', 'analytics']
  }
];

/**
 * Check whether a user has permission to access a specific module.
 */
export function hasPermission(
  userRole: string | undefined,
  userPermissions: string[] | undefined,
  moduleId: string
): boolean {
  if (!userRole) return false;
  
  // Super Admin has unconditional access
  if (userRole === 'admin') return true;

  // Super-admin only module
  if (moduleId === 'roles' && userRole !== 'admin') {
    return false;
  }

  // If user has 'all' permission flag
  if (userPermissions?.includes('all')) return true;

  // Check specific module
  return !!userPermissions && userPermissions.includes(moduleId);
}
