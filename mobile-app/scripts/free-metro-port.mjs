/**
 * Free Metro's default port (8081) before starting Expo.
 * Usage: node scripts/free-metro-port.mjs [port]
 */
import { execSync } from 'node:child_process';
import net from 'node:net';

const PORT = Number(process.env.METRO_PORT || process.argv[2] || 8081);
const MAX_ATTEMPTS = 8;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function portInLine(line, port) {
  return new RegExp(`:${port}(\\s|$)`, 'i').test(line);
}

function listListeningPidsWin(port) {
  const pids = new Set();

  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    for (const line of out.split(/\r?\n/)) {
      if (!/LISTENING/i.test(line) || !portInLine(line, port)) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
  } catch {
    /* try PowerShell next */
  }

  if (pids.size === 0) {
    try {
      const ps = execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      for (const line of ps.split(/\r?\n/)) {
        const pid = line.trim();
        if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
      }
    } catch {
      /* ignore */
    }
  }

  return [...pids];
}

function listListeningPidsUnix(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN 2>/dev/null || true`, {
      encoding: 'utf8',
      shell: true,
    });
    return out.split(/\s+/).filter((pid) => /^\d+$/.test(pid));
  } catch {
    return [];
  }
}

function listListeningPids(port) {
  return process.platform === 'win32' ? listListeningPidsWin(port) : listListeningPidsUnix(port);
}

function killPid(pid) {
  const self = String(process.pid);
  if (pid === self) return false;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

function canBindPort(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function isPortFullyFree(port) {
  const v4 = await canBindPort(port, '127.0.0.1');
  if (!v4) return false;
  if (process.platform === 'win32') {
    return canBindPort(port, '0.0.0.0');
  }
  return true;
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const pids = listListeningPids(PORT);

  if (pids.length) {
    console.log(
      `[TMLogistx] Port ${PORT} in use (attempt ${attempt}/${MAX_ATTEMPTS}) — stopping PID(s): ${pids.join(', ')}`
    );
    for (const pid of pids) {
      const ok = killPid(pid);
      console.log(ok ? `[TMLogistx] Killed PID ${pid}.` : `[TMLogistx] Could not kill PID ${pid}.`);
    }
    await sleep(900);
    continue;
  }

  if (await isPortFullyFree(PORT)) {
    console.log(`[TMLogistx] Port ${PORT} is ready.`);
    process.exit(0);
  }

  console.log(`[TMLogistx] Port ${PORT} still busy (attempt ${attempt}/${MAX_ATTEMPTS})…`);
  await sleep(500);
}

console.error(
  `[TMLogistx] Could not free port ${PORT}. Close Metro/Expo manually or run: netstat -ano | findstr :${PORT}`
);
process.exit(1);
