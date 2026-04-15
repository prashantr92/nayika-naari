// scripts/inject-sw-version.js
// npm run build se pehle ye chalega — SW mein build time inject karega
// package.json mein: "build": "node scripts/inject-sw-version.js && next build"

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/sw.js');
const buildTime = Date.now().toString();

let swContent = fs.readFileSync(swPath, 'utf8');

// Replace placeholder with actual build timestamp
swContent = swContent.replace('__BUILD_TIME__', buildTime);

fs.writeFileSync(swPath, swContent);
console.log(`[SW] Version injected: v${buildTime}`);