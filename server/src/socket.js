import { Server as SocketIOServer } from 'socket.io';
import { buildSocketCorsOptions } from './utils/corsOptions.js';

let ioInstance = null;

/**
 * Initialize Socket.io with the HTTP server instance
 */
export function initSocket(server) {
  ioInstance = new SocketIOServer(server, {
    cors: buildSocketCorsOptions()
  });

  ioInstance.on('connection', (socket) => {
    socket.on('join_project', (projectId) => {
      if (projectId) socket.join(`project_${projectId}`);
    });

    socket.on('join_user', (userId) => {
      if (userId) socket.join(`user_${userId}`);
    });

    socket.on('join_trip', (tripId) => {
      if (tripId) socket.join(`trip_${tripId}`);
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

export function emitToUser(userId, event, data) {
  if (ioInstance && userId) {
    ioInstance.to(`user_${userId}`).emit(event, data);
  }
}

/**
 * Project room + optional per-user rooms (staff/driver/portal) so every role
 * gets the event even if they missed join_project.
 */
export function emitToProject(projectId, event, data) {
  if (!ioInstance) return;
  if (projectId) {
    ioInstance.to(`project_${projectId}`).emit(event, data);
  }
  const ids = data?.notifyUserIds;
  if (Array.isArray(ids)) {
    const seen = new Set();
    for (const id of ids) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ioInstance.to(`user_${id}`).emit(event, data);
    }
  }
}

export function emitToTrip(tripId, event, data) {
  if (ioInstance && tripId) {
    ioInstance.to(`trip_${tripId}`).emit(event, data);
  }
}

export default {
  initSocket,
  getIO,
  emitToProject,
  emitToTrip,
  emitToUser
};
