const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'app.post("/api/products", async (req, res) => {',
  'app.post("/api/products", verifyAdminAccess("products"), async (req, res) => {'
);
content = content.replace(
  'app.put("/api/products/:id", async (req, res) => {',
  'app.put("/api/products/:id", verifyAdminAccess("products"), async (req, res) => {'
);
content = content.replace(
  'app.delete("/api/products/:id", async (req, res) => {',
  'app.delete("/api/products/:id", verifyAdminAccess("products"), async (req, res) => {'
);

content = content.replace(
  'app.post("/api/orders/update-status", async (req, res) => {',
  'app.post("/api/orders/update-status", verifyAdminAccess("orders"), async (req, res) => {'
);
content = content.replace(
  'app.post("/api/orders/delete", async (req, res) => {',
  'app.post("/api/orders/delete", verifyAdminAccess("orders"), async (req, res) => {'
);

fs.writeFileSync('server.ts', content);
