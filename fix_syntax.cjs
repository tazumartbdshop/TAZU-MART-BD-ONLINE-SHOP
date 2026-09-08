const fs = require('fs');
let content = fs.readFileSync('src/pages/Account.tsx', 'utf8');
content = content.replace(/activeTrackingOrder\.\(status \|\| ''\)\.toLowerCase\(\)/g, "(activeTrackingOrder.status || '').toLowerCase()");
fs.writeFileSync('src/pages/Account.tsx', content);

// Also check for any other broken syntax
const files = require('child_process').execSync('grep -rl "\\.\\(status" src/').toString().split('\n').filter(Boolean);
files.forEach(file => {
  let fContent = fs.readFileSync(file, 'utf8');
  fContent = fContent.replace(/\.\(status \|\| ''\)\.toLowerCase\(\)/g, "?.status?.toLowerCase() || ''");
  fs.writeFileSync(file, fContent);
});
