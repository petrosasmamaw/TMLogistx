/**
 * Start Expo for physical devices (LAN QR). Avoids opening the browser and
 * uses polling file watch on Windows / OneDrive so Metro stays stable.
 */
import { spawnSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const useTunnel = process.argv.includes('--tunnel');

process.chdir(root);
process.env.BROWSER = 'none';
process.env.EXPO_NO_DOTENV = '0';
if (process.platform === 'win32') {
  process.env.CHOKIDAR_USEPOLLING = '1';
  process.env.CHOKIDAR_INTERVAL = '1000';
}

const free = spawnSync(process.execPath, ['scripts/free-metro-port.mjs'], {
  stdio: 'inherit',
  env: process.env,
});
if (free.status !== 0) process.exit(free.status ?? 1);

const args = ['expo', 'start', '--port', '8081', '--clear'];
if (useTunnel) {
  args.push('--tunnel');
} else {
  args.push('--lan');
}

console.log(
  useTunnel
    ? '[TMLogistx] Expo tunnel — scan QR when ready (works across networks, slower).'
    : '[TMLogistx] Expo LAN — phone must be on the same Wi‑Fi; QR should show exp://192.168.x.x:8081'
);

const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
  cwd: root,
});

child.on('exit', (code) => process.exit(code ?? 0));
