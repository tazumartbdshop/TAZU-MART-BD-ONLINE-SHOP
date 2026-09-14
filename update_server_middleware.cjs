const fs = require('fs');

const middlewareCode = `
// RBAC Middleware
const verifyAdminAccess = (moduleId) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      // Check account status and role
      const moderators = await dbSelect('moderators');
      const mod = moderators.find(m => m.id === decoded.id || m.email === decoded.email);

      if (mod) {
        if (mod.status === 'Inactive') {
          return res.status(403).json({ error: 'Account disabled' });
        }
        if (mod.role === 'admin' || mod.role === 'super_admin') {
          return next();
        }
        
        let perms = [];
        try {
          perms = Array.isArray(mod.permissions) ? mod.permissions : JSON.parse(mod.permissions);
        } catch(e) {}

        if (perms.includes('all') || perms.includes(moduleId)) {
          return next();
        }

        return res.status(403).json({ error: 'Forbidden: Missing required module permission' });
      }

      // If not in moderators, check regular users table for super admin
      const users = await dbSelect('users');
      const adminUser = users.find(u => u.id === decoded.id || u.email === decoded.email);
      
      if (adminUser && adminUser.role === 'admin') {
        return next();
      }

      return res.status(403).json({ error: 'Forbidden: Not an admin' });
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
  };
};

`;

let content = fs.readFileSync('server.ts', 'utf8');

// Insert after JWT_SECRET declaration
content = content.replace(
  "const JWT_SECRET = process.env.JWT_SECRET || 'iyabd_hostinger_mysql_secret_2026';",
  "const JWT_SECRET = process.env.JWT_SECRET || 'iyabd_hostinger_mysql_secret_2026';" + middlewareCode
);

fs.writeFileSync('server.ts', content);
