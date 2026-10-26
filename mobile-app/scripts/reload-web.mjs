/**
 * Trigger Metro reload (same as pressing "r" in Expo) when the web tab is connected.
 * Usage: npm run reload   (while expo start / npm run dev is running)
 */
import http from 'node:http';

const PORTS = [8081, 8082, 19000, 19001];

function pingReload(port) {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: '/reload', method: 'GET', timeout: 2500 },
      (res) => {
        res.resume();
        resolve({ port, ok: res.statusCode >= 200 && res.statusCode < 400 });
      }
    );
    req.on('error', () => resolve({ port, ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ port, ok: false });
    });
    req.end();
  });
}

let anyOk = false;
for (const port of PORTS) {
  const { ok } = await pingReload(port);
  if (ok) {
    anyOk = true;
    console.log(`[TMLogistx] Reload sent to Metro on port ${port}.`);
  }
}

if (!anyOk) {
  console.log(
    '[TMLogistx] No Metro reload endpoint responded. Start the app with: npm run dev\n' +
      'Keep http://localhost:8081 open in the browser, or press w in the Expo terminal.\n' +
      'You can also refresh the browser with F5 / Ctrl+R.'
  );
} else {
  console.log('[TMLogistx] If the UI did not update, refresh the browser tab once (F5).');
}
