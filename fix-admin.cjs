const fs = require('fs');
const path = require('path');

function replaceFile(filePath, regex, replacement) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content.replace(regex, replacement);
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  }
}

// AdminDashboard.tsx
let adminDash = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');
if (!adminDash.includes('path="*"')) {
  adminDash = adminDash.replace(
    /<\/Routes>\s*<\/div>/,
    `  <Route path="*" element={
                <div className="bg-white p-12 text-center border border-gray-100 min-h-[50vh] flex flex-col items-center justify-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">404 - Module Not Found</h2>
                  <p className="text-gray-500 mb-6">The admin module you are looking for does not exist or you do not have permission to view it.</p>
                  <Link to="/admin" className="px-6 py-2 bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors">Go to Dashboard</Link>
                </div>
              } />
            </Routes>
        </div>`
  );
  fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', adminDash);
  console.log('Updated AdminDashboard.tsx routes');
}

// Header.tsx
replaceFile('src/components/layout/Header.tsx', /user\?\.name \? user\.name\.charAt\(0\)\.toUpperCase\(\) : <User className="w-6 h-6" \/>/g, 
  `(user?.name || 'User').charAt(0).toUpperCase()`);

// Just to make sure we also catch other potential data.name.toUpperCase()
let headerContent = fs.readFileSync('src/components/layout/Header.tsx', 'utf8');
// Let's replace any potential crash with charAt
headerContent = headerContent.replace(/user\.name\.charAt/g, '(user?.name || "ADMIN").charAt');
fs.writeFileSync('src/components/layout/Header.tsx', headerContent);

// AdminSupport.tsx
replaceFile('src/pages/admin/AdminSupport.tsx', /currentChat\.customerName\?\.\[0\]\?\.toUpperCase\(\) \|\| 'C'/g,
  `(currentChat?.customerName || 'C')[0]?.toUpperCase() || 'C'`);

// AdminOrdersCardView.tsx
replaceFile('src/pages/admin/AdminOrdersCardView.tsx', /displayName\.trim\(\)\.charAt\(0\)\.toUpperCase\(\)/g,
  `(displayName || 'C').trim().charAt(0).toUpperCase()`);

// AdminOrders.tsx
replaceFile('src/pages/admin/AdminOrders.tsx', /displayName\.trim\(\)\.charAt\(0\)\.toUpperCase\(\)/g,
  `(displayName || 'C').trim().charAt(0).toUpperCase()`);
