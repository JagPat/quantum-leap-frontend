#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read build info
const buildInfo = JSON.parse(fs.readFileSync('build-info.json', 'utf8'));

// Create version.js in dist
const versionContent = `
// Auto-generated version info
export const VERSION_INFO = ${JSON.stringify(buildInfo, null, 2)};

export const getVersion = () => VERSION_INFO;
`;

const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'version.js'), versionContent);
  console.log('✅ Version info injected into dist/version.js');
} else {
  console.log('⚠️ Dist directory not found, skipping version injection');
}
