const fs = require('fs');
let headerContent = fs.readFileSync('src/components/layout/Header.tsx', 'utf8');
if (headerContent.includes('(user?.name || \'User\').charAt(0).toUpperCase()')) {
  console.log('Header is safe');
}
let adminSupportContent = fs.readFileSync('src/pages/admin/AdminSupport.tsx', 'utf8');
if (adminSupportContent.includes('(currentChat?.customerName || \'C\')[0]?.toUpperCase()')) {
  console.log('AdminSupport is safe for [0]');
}
