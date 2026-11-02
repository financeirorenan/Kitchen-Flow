// Safe postinstall script for Hostinger / Production deployments
// Skips heavy build inside AI Studio's bun install container so bun install never fails,
// while automatically building dist/ on Hostinger / production npm install.
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

try {
  const cwd = process.cwd();
  const isAiStudioContainer =
    cwd === '/app/applet' ||
    cwd.startsWith('/app/applet/') ||
    Boolean(process.env.APP_URL && process.env.APP_URL.includes('.run.app')) ||
    Boolean(process.env.npm_execpath && process.env.npm_execpath.includes('bun'));

  if (isAiStudioContainer) {
    console.log('[KitchenFlow postinstall] Ambiente AI Studio detectado — pulando build no postinstall.');
    process.exit(0);
  }

  console.log('[KitchenFlow postinstall] Ambiente de produção/Hostinger detectado — compilando dist/...');
  execSync('npm run build', { cwd, stdio: 'inherit' });
  console.log('[KitchenFlow postinstall] Build concluído com sucesso.');
} catch (err) {
  console.warn('[KitchenFlow postinstall] Aviso durante build no postinstall (servidor fará fallback automático):', err && err.message ? err.message : err);
}

process.exit(0);
