const fs = require('fs');
let content = fs.readFileSync('src/main.tsx', 'utf8');

const patchCode = `
// Intercept fetch to add auth token
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  if (typeof resource === 'string' && resource.startsWith('/api/')) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config = config || {};
      config.headers = {
        ...config.headers,
        'Authorization': \`Bearer \${token}\`
      };
    }
  }
  return originalFetch(resource, config);
};
`;

if (!content.includes('originalFetch')) {
  content = content.replace("import App from './App';", "import App from './App';\n" + patchCode);
  fs.writeFileSync('src/main.tsx', content);
}
