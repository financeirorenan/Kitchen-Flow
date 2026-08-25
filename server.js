// Compatibility entrypoint for deployment environments configured with "server.js"
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const require = createRequire(import.meta.url);
const bundledServer = path.resolve(process.cwd(), 'dist/server.cjs');

if (!existsSync(bundledServer)) {
  console.log('[KitchenFlow] dist/server.cjs not found. Triggering build now...');
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

