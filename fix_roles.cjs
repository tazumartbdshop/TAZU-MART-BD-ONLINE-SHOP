const fs = require('fs');

let authStore = fs.readFileSync('src/store/useAuthStore.ts', 'utf8');
authStore = authStore.replace(
  "type UserRole = 'customer' | 'admin' | 'moderator';",
  "type UserRole = 'customer' | 'admin' | 'moderator' | 'staff' | 'support';"
);
fs.writeFileSync('src/store/useAuthStore.ts', authStore);

let adminDash = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');
adminDash = adminDash.replace(
  "if (user.role === 'moderator') {",
  "if (['moderator', 'staff', 'support'].includes(user.role)) {"
);
fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', adminDash);
