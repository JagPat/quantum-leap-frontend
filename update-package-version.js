const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add version script
packageJson.scripts = {
  ...packageJson.scripts,
  'version:check': 'node -e "console.log(require(\'./build-info.json\'))"',
  'build:with-version': 'npm run build && node scripts/inject-version.js'
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ Package.json updated with version scripts');
