const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, '../src/assets/env.js');
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';

const content = `window.__env = window.__env || {};\nwindow.__env.GOOGLE_CLIENT_ID = '${googleClientId.replace(/'/g, "\\'")}';\n`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log(`Generated runtime env at ${outputPath}`);
