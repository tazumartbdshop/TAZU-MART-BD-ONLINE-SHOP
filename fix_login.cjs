const fs = require('fs');

let content = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const replacement = `
        // 3. Check Moderator / Staff Account
        try {
          const res = await fetch('/api/admin/moderators/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedIdentifier, password })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              localStorage.setItem('auth_token', data.token);
              login(data.user);
              navigate('/admin');
              return;
            }
          }
        } catch (e) {
          console.warn("Backend login failed, falling back to local DB check", e);
        }

        // 3b. Fallback Local Check Moderator / Staff Account
        const moderator = useModeratorStore.getState().getModeratorByEmail(normalizedIdentifier);
`;

content = content.replace(
  "        // 3. Check Moderator / Staff Account\n        const moderator = useModeratorStore.getState().getModeratorByEmail(normalizedIdentifier);",
  replacement
);

fs.writeFileSync('src/pages/Login.tsx', content);
