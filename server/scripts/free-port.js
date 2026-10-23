/**
 * Free TCP port before `npm run dev` (Windows + Git Bash / netstat).
 */
import { execSync } from 'child_process';

const port = String(process.env.PORT || 5000);

function killOnWindows() {
  let out = '';
  try {
    out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch {
    return;
  }

  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes('LISTENING')) continue;
    const trimmed = line.trim();
    const pid = trimmed.split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid) && pid !== '0') {
      pids.add(pid);
    }
  }

  for (const pid of pids) {
    try {
      console.log(`[free-port] Stopping PID ${pid} on port ${port}`);
      execSync(`taskkill //PID ${pid} //F`, { stdio: 'inherit' });
    } catch {
      console.warn(`[free-port] Could not kill PID ${pid}`);
    }
  }
}

killOnWindows();
