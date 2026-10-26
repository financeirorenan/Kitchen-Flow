// Compatibility entrypoint for Hostinger / Node.js deployment environments configured with "server.js"
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const require = createRequire(import.meta.url);
const bundledServer = path.resolve(process.cwd(), 'dist/server.cjs');
const builtIndex = path.resolve(process.cwd(), 'dist/index.html');

if (!existsSync(bundledServer) || !existsSync(builtIndex)) {
  console.log('[KitchenFlow] Build artifacts not found in dist/. Triggering build now...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (e) {
    console.error('[KitchenFlow] Build failed:', e);
    process.exit(1);
  }
}

if (existsSync(bundledServer)) {
  require(bundledServer);
} else {
  console.error('[KitchenFlow] Critical: Failed to find or generate dist/server.cjs');
  process.exit(1);
}

