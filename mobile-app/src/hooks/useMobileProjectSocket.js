import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
  refreshStaffTrips,
  refreshDriverAssignments,
  patchActiveTripDriverLocation,
  applyTripUpdateFromSocket,
  bumpDriverStats
} from '../store/tripSlice';
import { notifyOnce } from '../services/localNotifications';

function payloadRequestId(payload) {
  return (
    payload?.requestId ||
    payload?.request?.id ||
    payload?.assignment?.request_id ||
    payload?.assignment?.request?.id ||
    null
  );
}

function payloadStaffId(payload) {
  return (
    payload?.request?.staff_id ||
    payload?.assignment?.request?.staff_id ||
    payload?.assignment?.staff?.id ||
    null
  );
}

function payloadDriverUserId(payload) {
  return payload?.assignment?.driver?.user_id || null;
}

function resolveSocketUrl() {
  const fromSocket = (process.env.EXPO_PUBLIC_SOCKET_URL || '').replace(/\/$/, '');
  const api = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
  const fromApi = api ? api.replace(/\/api\/?$/i, '') : '';
  if (fromSocket) return fromSocket;
  if (fromApi) return fromApi;
  return '';
}

function resolveProjectId(user) {
  return user?.project_id || user?.projectId || user?.project?.id || null;
}

function collectProjectIds(user, activeTrip, staffRequests, assignedTrips) {
  const ids = new Set();
  const primary = resolveProjectId(user);
  if (primary) ids.add(String(primary));
  if (activeTrip?.project_id) ids.add(String(activeTrip.project_id));
  (staffRequests || []).forEach((r) => {
    if (r?.project_id) ids.add(String(r.project_id));
  });
  (assignedTrips || []).forEach((r) => {
    if (r?.project_id) ids.add(String(r.project_id));
  });
  return Array.from(ids);
}

/**
 * One persistent socket per login. Rooms re-join on connect; lists append/patch (no reload).
 */
export default function useMobileProjectSocket() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const activeTrip = useSelector((state) => state.trips.activeTrip);
  const staffRequests = useSelector((state) => state.trips.requests);
  const assignedTrips = useSelector((state) => state.trips.assignedTrips);
  const role = user?.role;

  const projectIds = useMemo(
    () => collectProjectIds(user, activeTrip, staffRequests, assignedTrips),
    [
      user?.id,
      user?.project_id,
      activeTrip?.project_id,
      (staffRequests || []).map((r) => r.project_id).filter(Boolean).sort().join('|'),
      (assignedTrips || []).map((r) => r.project_id).filter(Boolean).sort().join('|')
    ]
  );

  const assignmentId = activeTrip?.assignment_id || null;
  const socketRef = useRef(null);
  const projectIdsRef = useRef(projectIds);
  const assignmentIdRef = useRef(assignmentId);
  const userIdRef = useRef(user?.id);
  const roleRef = useRef(role);
  projectIdsRef.current = projectIds;
  assignmentIdRef.current = assignmentId;
  userIdRef.current = user?.id;
  roleRef.current = role;

  useEffect(() => {
    if (!user?.id) return undefined;
    const base = resolveSocketUrl();
    if (!base) return undefined;

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

    let lastListBootstrap = 0;
    const bootstrapLists = () => {
      const now = Date.now();
      if (now - lastListBootstrap < 8000) return;
      lastListBootstrap = now;
      const r = roleRef.current;
      if (r === 'STAFF') {
        dispatch(refreshStaffTrips({ silent: true }));
      } else if (r === 'DRIVER') {
        dispatch(refreshDriverAssignments({ silent: true }));
      }
    };

    const joinRooms = () => {
      if (userIdRef.current) socket.emit('join_user', userIdRef.current);
      projectIdsRef.current.forEach((pid) => socket.emit('join_project', pid));
      if (assignmentIdRef.current) socket.emit('join_trip', assignmentIdRef.current);
    };

    socket.on('connect', () => {
      joinRooms();
      bootstrapLists();
    });
    joinRooms();
    bootstrapLists();

    const mergeTripPayload = (payload) => {
      if (!payload) return;
      dispatch(
        applyTripUpdateFromSocket({
          assignmentId: payload.assignmentId,
          requestId: payload.requestId,
          newStatus: payload.newStatus,
          assignment: payload.assignment,
          request: payload.request || payload.assignment?.request
        })
      );
    };

    const tripEvents = [
      'trip_reassigned',
      'trip_assignment_cancelled',
      'driver_assignment_rejected',
      'fleet_trip_started',
      'external_transport_authorized',
      'external_ride_started',
      'external_ride_completed'
    ];

    tripEvents.forEach((ev) => {
      socket.on(ev, mergeTripPayload);
    });

    socket.on('trip_assigned', (payload) => {
      mergeTripPayload(payload);
      const r = roleRef.current;
      const me = userIdRef.current;
      const requestId = payloadRequestId(payload);
      const code = payload?.requestCode || payload?.request?.request_code;
      if (r === 'DRIVER') {
        const driverUserId = payloadDriverUserId(payload);
        if (driverUserId && driverUserId !== me) return;
        const assignmentId = payload?.assignment?.id || payload?.assignmentId;
        notifyOnce(
          `assign-${assignmentId || requestId}`,
          'New trip assignment',
          `You have been assigned${code ? ` (${code})` : ''}. Open Trips to accept.`
        );
      } else if (r === 'STAFF') {
        const staffId = payloadStaffId(payload);
        if (!staffId || staffId !== me) return;
        const plate = payload?.vehiclePlate || payload?.assignment?.vehicle?.plate_number;
        const name = payload?.driverName || payload?.assignment?.driver?.full_name;
        notifyOnce(
          `staff-assigned-${requestId}`,
          'Driver assigned',
          name
            ? `${plate || 'Fleet vehicle'} — ${name} is coming to your pickup.`
            : 'A driver has been assigned to your movement.'
        );
      }
    });

    socket.on('trip_status_changed', (payload) => {
      mergeTripPayload(payload);
      if (!payload?.newStatus) return;
      const status = String(payload.newStatus).toUpperCase();
      const key = `st-${payload.requestId || payload.assignmentId}-${status}`;
      const r = roleRef.current;
      if (r === 'DRIVER' && status === 'COMPLETED' && once(key, 8000)) {
        dispatch(bumpDriverStats());
      }
      if (r !== 'STAFF') return;
      const staffId = payloadStaffId(payload);
      if (!staffId || staffId !== userIdRef.current) return;
      const requestId = payloadRequestId(payload);
      if (status === 'ARRIVED') {
        notifyOnce(
          `arrived-${requestId}`,
          'Driver arrived at pickup',
          'Your driver has arrived at the pickup location.'
        );
      } else if (status === 'COMPLETED') {
        notifyOnce(`completed-${requestId}`, 'Trip completed', 'Your movement has been marked complete.');
      }
    });

    socket.on('driver_location_updated', (payload) => {
      if (roleRef.current !== 'STAFF') return;
      if (payload?.latitude == null || payload?.longitude == null) return;
      dispatch(
        patchActiveTripDriverLocation({
          driverId: payload.driverId,
          latitude: payload.latitude,
          longitude: payload.longitude
        })
      );
    });

    return () => {
      socket.off('connect', joinRooms);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [dispatch, user?.id, role]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    if (user?.id) socket.emit('join_user', user.id);
    projectIds.forEach((pid) => socket.emit('join_project', pid));
    if (assignmentId) socket.emit('join_trip', assignmentId);
  }, [projectIds.join('|'), assignmentId, user?.id]);
}
