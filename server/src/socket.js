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
      socket.join(`project_${projectId}`);
    });

    socket.on('join_trip', (tripId) => {
      socket.join(`trip_${tripId}`);
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return ioInstance;
}

/**
 * Retrieve the active Socket.io instance
 */
export function getIO() {
  return ioInstance;
}

/**
 * Emit event to a specific project room
 */
export function emitToProject(projectId, event, data) {
  if (ioInstance) {
    ioInstance.to(`project_${projectId}`).emit(event, data);
  }
}

/**
 * Emit event to a specific trip room
 */
export function emitToTrip(tripId, event, data) {
  if (ioInstance) {
    ioInstance.to(`trip_${tripId}`).emit(event, data);
  }
}

export default {
  initSocket,
  getIO,
  emitToProject,
  emitToTrip
};
