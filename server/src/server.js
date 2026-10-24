import http from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { initSocket } from './socket.js';
import db from './db/connection.js';

const server = http.createServer(app);

// Setup Socket.io for Real-time GPS & Dispatch updates
initSocket(server);

try {
  await db.ensureStoreReady();
} catch (err) {
  console.error('[Server] Store hydrate failed:', err.message);
  process.exit(1);
}

server.listen(config.port, () => {
  console.log('====================================================');
  console.log(`🚀 TMLogistx Central Server running on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  const base =
    config.publicApiUrl ||
    (config.isProduction ? 'https://tmlogistx.onrender.com' : `http://localhost:${config.port}`);
  console.log(`🌐 API base: ${base.replace(/\/$/, '')}/api`);
  console.log(
    `🔒 CORS web origins: ${config.corsOrigins.length ? config.corsOrigins.join(', ') : '(none — set CORS_ORIGIN)'}`
  );
  console.log(`📱 CORS no-Origin (mobile app): ${config.corsAllowNoOrigin ? 'allowed' : 'blocked'}`);
  console.log(`⚡ WebSocket Server attached on port ${config.port}`);
  console.log('====================================================');
});

const shutdown = async () => {
  try {
    await db.saveStore();
  } catch (err) {
    console.error('[Server] Final store save failed:', err.message);
  }
  server.close(() => {
    console.log('[Server] Process terminated gracefully.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
