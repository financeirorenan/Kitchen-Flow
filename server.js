// Compatibility entrypoint for Hostinger / LiteSpeed lsnode.js / Node.js environments configured with "server.js"
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const appRoot = __dirname || process.cwd();
const bundledServer = fs.existsSync(path.resolve(appRoot, 'dist/server.cjs'))
  ? path.resolve(appRoot, 'dist/server.cjs')
  : path.resolve(process.cwd(), 'dist/server.cjs');
const builtIndex = fs.existsSync(path.resolve(appRoot, 'dist/index.html'))
  ? path.resolve(appRoot, 'dist/index.html')
  : path.resolve(process.cwd(), 'dist/index.html');

if (!fs.existsSync(bundledServer) || !fs.existsSync(builtIndex)) {
  console.log('[KitchenFlow] Build artifacts not found in dist/. Triggering build now...');
  try {
    execSync('npm run build', { cwd: appRoot, stdio: 'inherit' });
  } catch (e) {
    console.error('[KitchenFlow] Build failed:', e);
  }
}

const finalServerPath = fs.existsSync(path.resolve(appRoot, 'dist/server.cjs'))
  ? path.resolve(appRoot, 'dist/server.cjs')
  : path.resolve(process.cwd(), 'dist/server.cjs');

if (fs.existsSync(finalServerPath)) {
  module.exports = require(finalServerPath);
} else {
  console.error('[KitchenFlow] Critical: Failed to find dist/server.cjs');
  process.exit(1);
}

