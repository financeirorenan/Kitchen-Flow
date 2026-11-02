// Entrypoint for Hostinger / LiteSpeed lsnode.js / Phusion Passenger / Node.js production environments
const fs = require('node:fs');
const path = require('node:path');
const { execSync, spawn } = require('node:child_process');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const appRoot = __dirname || process.cwd();
const distDir = path.resolve(appRoot, 'dist');
const bundledServer = path.resolve(distDir, 'server.cjs');
const builtIndex = path.resolve(distDir, 'index.html');

// 1. Ensure dist/server.cjs exists immediately (~40ms with esbuild) so app.listen() binds right away without 503 timeout
if (!fs.existsSync(bundledServer)) {
  console.log('[KitchenFlow] Bundling server.ts -> dist/server.cjs via esbuild...');
  try {
    fs.mkdirSync(distDir, { recursive: true });
    execSync(
      'npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs',
      { cwd: appRoot, stdio: 'inherit' }
    );
  } catch (e) {
    console.error('[KitchenFlow] Fast esbuild bundle failed:', e);
  }
}

// 2. If frontend dist/index.html is missing, build it asynchronously in background AFTER server binds port
if (!fs.existsSync(builtIndex)) {
  console.log('[KitchenFlow] dist/index.html not found — starting background vite build...');
  setTimeout(() => {
    try {
      const child = spawn('npx', ['vite', 'build'], {
        cwd: appRoot,
        stdio: 'inherit',
        shell: true
      });
      child.on('error', (err) => {
        console.error('[KitchenFlow] Background vite build error:', err);
      });
    } catch (e) {
      console.error('[KitchenFlow] Failed to spawn background vite build:', e);
    }
  }, 100);
}

// 3. Start the bundled Express server immediately so LiteSpeed lsnode.js / Passenger connects to the socket
if (fs.existsSync(bundledServer)) {
  module.exports = require(bundledServer);
} else {
  console.error('[KitchenFlow] Critical: dist/server.cjs not found');
  process.exit(1);
}
