const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'app.get("/api/admin/moderators", async (req, res) => {',
  'app.get("/api/admin/moderators", verifyAdminAccess("roles"), async (req, res) => {'
);

content = content.replace(
  'app.post("/api/admin/moderators", async (req, res) => {',
  'app.post("/api/admin/moderators", verifyAdminAccess("roles"), async (req, res) => {'
);

content = content.replace(
  'app.put("/api/admin/moderators/:id", async (req, res) => {',
  'app.put("/api/admin/moderators/:id", verifyAdminAccess("roles"), async (req, res) => {'
);

content = content.replace(
  'app.delete("/api/admin/moderators/:id", async (req, res) => {',
  'app.delete("/api/admin/moderators/:id", verifyAdminAccess("roles"), async (req, res) => {'
);

fs.writeFileSync('server.ts', content);
