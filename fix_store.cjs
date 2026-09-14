const fs = require('fs');
let content = fs.readFileSync('src/store/useModeratorStore.ts', 'utf8');

content = content.replace(/\.then\(\(\{ error \}: any\) => error \.then\(\(\{ error \}: any\) => error && console\.warn\(error\)\);\.then\(\(\{ error \}: any\) => error && console\.warn\(error\)\); console\.warn\(error\)\)\.catch\(\(e: any\) => console\.warn\(e\)\);/g, ".then(({ error }: any) => error && console.warn(error)).catch((e: any) => console.warn(e));");

fs.writeFileSync('src/store/useModeratorStore.ts', content);
