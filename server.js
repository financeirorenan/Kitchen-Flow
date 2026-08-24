// Compatibility entrypoint for deployment environments configured with "server.js"
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const bundledServer = path.resolve(process.cwd(), 'dist/server.cjs');

if (existsSync(bundledServer)) {
  require(bundledServer);
} else {
  // If dist/server.cjs is not yet built, start TS runner directly
  import('./server.ts');
}
