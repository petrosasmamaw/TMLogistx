import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '../store/slices/projectSlice.js';
import { io } from 'socket.io-client';
import { updateLiveDriverLocation, updateLiveLocation } from '../store/slices/fleetSlice.js';
import {
  fetchRequests,
  upsertRequest,
  patchRequestFromAssignment,
  patchRequestStatusByAssignment
} from '../store/slices/dispatchSlice.js';
import { broadcastRequestUpsert } from '../utils/mergeRequests.js';
import { showWebNotification } from '../utils/webNotifications.js';

function resolveSocketUrl() {
  const fromEnv = (import.meta.env.VITE_SOCKET_URL || '').replace(/\/$/, '');
  const api = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const fromApi = api ? api.replace(/\/api\/?$/i, '') : '';
  if (fromEnv) return fromEnv;
  if (fromApi) return fromApi;
  return 'http://localhost:5000';
}

function resolveProjectId(user) {
  return user?.project_id || user?.projectId || user?.project?.id || null;
}

const PORTAL_ROLES = [
  'LOGISTICS_COORDINATOR',
  'MOVEMENT_CENTER',
  'MOVEMENT_OFFICER',
  'MASTER_PERSON',
  'SYSTEM_ADMIN'
];

function collectProjectIds(user, projects) {
  const ids = new Set();
  const primary = resolveProjectId(user);
  if (primary) ids.add(String(primary));
  (projects || []).forEach((p) => {
    if (p?.id) ids.add(String(p.id));
  });
  return Array.from(ids);
}

export default function useFleetLiveSocket() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const projects = useSelector((state) => state.project.projects) || [];

  const projectIds = useMemo(
    () => collectProjectIds(user, projects),
    [user?.project_id, user?.projectId, user?.id, projects]
  );
  const projectKey = projectIds.join('|');

  const socketRef = useRef(null);
  const projectIdsRef = useRef(projectIds);
  const userIdRef = useRef(user?.id);
  projectIdsRef.current = projectIds;
  userIdRef.current = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !PORTAL_ROLES.includes(role)) return undefined;
    if (!projects.length) dispatch(fetchProjects());
  }, [dispatch, role, isAuthenticated, projects.length]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !PORTAL_ROLES.includes(role)) return undefined;

    const base = resolveSocketUrl();
    const socket = io(base, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity
    });
    socketRef.current = socket;
    const seenEvents = new Map();
    const once = (key, ttlMs = 4000) => {
      const now = Date.now();
      const prev = seenEvents.get(key) || 0;
      if (now - prev < ttlMs) return false;
      seenEvents.set(key, now);
      return true;
    };

    const joinRooms = () => {
      if (userIdRef.current) socket.emit('join_user', userIdRef.current);
      projectIdsRef.current.forEach((pid) => socket.emit('join_project', pid));
    };

    socket.on('connect', joinRooms);
    joinRooms();

    socket.on('vehicle_location_updated', (payload) => {
      if (!payload?.vehicleId) return;
      dispatch(
        updateLiveLocation({
          vehicleId: payload.vehicleId,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
          heading: payload.heading,
          reportedAt: payload.reportedAt,
          driverId: payload.driverId
        })
      );
    });

    socket.on('driver_location_updated', (payload) => {
      if (!payload?.driverId) return;
      dispatch(
        updateLiveDriverLocation({
          driverId: payload.driverId,
          vehicleId: payload.vehicleId,
          latitude: payload.latitude,
          longitude: payload.longitude,
          reportedAt: payload.reportedAt
        })
      );
    });

    socket.on('new_movement_request', async (payload) => {
      const req = payload?.request;
      if (!req?.id) return;
      dispatch(upsertRequest(req));
      const first = once(`req-${req.id}`);
      if (first) broadcastRequestUpsert(req);
      const staffName = payload?.staffName || req?.staff?.full_name || 'Staff member';
      const code = req.request_code || req.request_number || '';
      if (first) {
        await showWebNotification(
          'New movement request',
          `${staffName} submitted a trip${code ? ` (${code})` : ''}.`
        );
      }
    });

    const patchFromAssignmentPayload = async (payload, notifyTitle, notifyBody) => {
      const a = payload?.assignment;
      const requestId =
        payload?.requestId || a?.request_id || a?.request?.id || payload?.request?.id;
      const newStatus = payload?.newStatus || a?.status;
      if (a && requestId) {
        dispatch(
          patchRequestFromAssignment({
            requestId,
            status: newStatus || 'ASSIGNED',
            assignment: a,
            driverName: a.driver?.full_name || payload.driverName,
            vehiclePlate: a.vehicle?.plate_number || payload.vehiclePlate
          })
        );
        const reqRow = payload?.request || a?.request;
        if (reqRow?.id) {
          dispatch(
            upsertRequest({
              ...reqRow,
              status: newStatus || reqRow.status,
              assignment: a
            })
          );
          broadcastRequestUpsert(reqRow);
        }
      } else if (payload?.assignmentId && newStatus) {
        dispatch(
          patchRequestStatusByAssignment({
            assignmentId: payload.assignmentId,
            newStatus
          })
        );
      }
      if (notifyTitle && notifyBody && once(`n-${requestId || payload?.assignmentId}-${notifyTitle}`)) {
        await showWebNotification(notifyTitle, notifyBody);
      }
    };

    socket.on('trip_assigned', (payload) => {
      patchFromAssignmentPayload(payload);
    });

    socket.on('trip_reassigned', (payload) => {
      patchFromAssignmentPayload(payload, 'Trip reassigned', 'A trip was reassigned to another driver.');
    });

    socket.on('trip_status_changed', (payload) => {
      const status = payload?.newStatus;
      let title;
      let body;
      if (status === 'ARRIVED') {
        title = 'Driver arrived';
        body = 'A driver has arrived at the pickup location.';
      } else if (status === 'ACCEPTED') {
        title = 'Driver accepted';
        body = 'A driver accepted an assigned trip.';
      } else if (status === 'IN_TRANSIT' || status === 'PASSENGER_PICKED_UP') {
        title = 'Trip started';
        body = 'The driver started the trip.';
      } else if (status === 'COMPLETED') {
        title = 'Trip completed';
        body = 'The movement trip has ended.';
      }
      patchFromAssignmentPayload(payload, title, body);
    });

    socket.on('fleet_trip_started', (payload) => {
      patchFromAssignmentPayload(payload, 'Trip started', 'A fleet trip is now in transit.');
    });

    socket.on('driver_assignment_rejected', (payload) => {
      if (payload?.requestId) {
        dispatch(
          patchRequestFromAssignment({
            requestId: payload.requestId,
            status: 'PENDING',
            assignment: null
          })
        );
      }
    });

    socket.on('trip_assignment_cancelled', (payload) => {
      if (payload?.requestId) {
        dispatch(
          patchRequestFromAssignment({
            requestId: payload.requestId,
            status: 'PENDING',
            assignment: null
          })
        );
      }
    });

    const softSync = () => dispatch(fetchRequests({ silent: true }));

    socket.on('external_transport_authorized', (payload) => {
      if (payload?.request) dispatch(upsertRequest(payload.request));
      else softSync();
    });
    socket.on('external_ride_started', (payload) => {
      if (payload?.request) dispatch(upsertRequest(payload.request));
      else softSync();
    });
    socket.on('external_ride_completed', (payload) => {
      if (payload?.request) dispatch(upsertRequest(payload.request));
      else softSync();
    });
    socket.on('incident_alert', softSync);

    return () => {
      socket.off('connect', joinRooms);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [dispatch, isAuthenticated, user?.id, role]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (user?.id) socket.emit('join_user', user.id);
    projectIds.forEach((pid) => socket.emit('join_project', pid));
  }, [projectKey, user?.id]);
}
