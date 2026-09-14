import fs from 'fs';
let content = fs.readFileSync('src/db/mysql.ts', 'utf8');

content = content.replace(
  "console.warn(`[Supabase Select] Error querying table ${targetTable}:`, error.message);",
  `if (!error.message.includes('Could not find the table')) { console.warn(\`[Supabase Select] Error querying table \${targetTable}:\`, error.message); }`
);

content = content.replace(
  "console.warn(`[Supabase Insert] Error on table ${targetTable}:`, error.message);",
  `if (!error.message.includes('Could not find the table')) { console.warn(\`[Supabase Insert] Error on table \${targetTable}:\`, error.message); }`
);

content = content.replace(
  "console.warn(`[Supabase Update] Error on table ${targetTable}:`, error.message);",
  `if (!error.message.includes('Could not find the table')) { console.warn(\`[Supabase Update] Error on table \${targetTable}:\`, error.message); }`
);

content = content.replace(
  "console.warn(`[Supabase Delete] Error on table ${targetTable}:`, error.message);",
  `if (!error.message.includes('Could not find the table')) { console.warn(\`[Supabase Delete] Error on table \${targetTable}:\`, error.message); }`
);

fs.writeFileSync('src/db/mysql.ts', content);
