const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/ModeratorManagement.tsx', 'utf8');

const newModules = `const MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'orders', name: 'Orders' },
  { id: 'products', name: 'Products & Upload' },
  { id: 'users', name: 'Customers' },
  { id: 'categories', name: 'Categories' },
  { id: 'banners', name: 'Banner Control' },
  { id: 'reviews', name: 'Reviews' },
  { id: 'payments', name: 'Payment Management' },
  { id: 'delivery', name: 'Delivery Management' },
  { id: 'settings', name: 'Settings' },
  { id: 'roles', name: 'Admin Management' },
  { id: 'support', name: 'Messages / Support' },
  { id: 'campaigns', name: 'Campaigns & Promos' },
  { id: 'analytics', name: 'Analytics & SEO' }
];`;

content = content.replace(/const MODULES = \[[\s\S]*?\];/, newModules);
fs.writeFileSync('src/pages/admin/ModeratorManagement.tsx', content);
