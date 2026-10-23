import { v4 as uuidv4 } from 'uuid';
import { getStore, queueStoreSave } from '../db/connection.js';
import { filterBySiteId, getAuthorizedProjectIds, getRequesterProjectId } from '../utils/projectScope.js';
import { logAudit } from '../middleware/audit.js';
import { emitToProject } from '../socket.js';
import { enrichMovementRequest, mapRequestForMobile } from '../utils/mobileTripMapper.js';

export async function getMyRequests(req, res, next) {
  try {
    const store = getStore();
    const staffId =
      store.users.find((u) => u.id === req.user.userId)?.id ||
      req.user.userId;
    const requests = (store.movement_requests || [])
      .filter((r) => r.staff_id === staffId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const enriched = requests.map((row) => enrichMovementRequest(store, row));
    const mobile = enriched.map(mapRequestForMobile);

    res.json({
      success: true,
      count: enriched.length,
      data: enriched,
      requests: mobile
    });
  } catch (err) {
    next(err);
  }
}

export async function getRequests(req, res, next) {
  try {
    const store = getStore();
    const { status, project_id, site_id } = req.query;

    let requests = [];

    if (req.user.role === 'STAFF') {
      // Staff only sees their own requests
      requests = store.movement_requests.filter(r => r.staff_id === req.user.userId);
    } else if (req.user.role === 'SYSTEM_ADMIN') {
      requests = project_id 
        ? store.movement_requests.filter(r => r.project_id === project_id)
        : store.movement_requests;
    } else if (req.user.role === 'MASTER_PERSON') {
      const authorized = getAuthorizedProjectIds(req.user);
      requests = store.movement_requests.filter((r) => authorized.includes(r.project_id));
      if (project_id && authorized.includes(project_id)) {
        requests = requests.filter((r) => r.project_id === project_id);
      }
    } else {
      const scopeId = getRequesterProjectId(req.user, store);
      requests = scopeId
        ? store.movement_requests.filter((r) => r.project_id === scopeId)
        : [];
    }

    if (status) {
      requests = requests.filter(r => r.status === status.toUpperCase());
    }

    if (site_id && site_id !== 'ALL') {
      requests = filterBySiteId(requests, site_id, { store, staffKey: 'staff_id' });
    }

    // Sort newest first
    requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const enriched = requests.map((reqItem) => enrichMovementRequest(store, reqItem));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getRequestById(req, res, next) {
  try {
    const { id } = req.params;
    const store = getStore();
    const reqItem = store.movement_requests.find(r => r.id === id);

    if (!reqItem) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }

    // Role access check
    if (req.user.role === 'STAFF' && reqItem.staff_id !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only view your own requests' });
    }

    const staffUser = store.users.find(u => u.id === reqItem.staff_id);
    const assignment = store.trip_assignments.find(t => t.request_id === reqItem.id);
    const externalTransport = store.external_transports.find(e => e.request_id === reqItem.id);

    let assignmentDetails = null;
    if (assignment) {
      const vehicle = store.vehicles.find(v => v.id === assignment.vehicle_id);
      const driver = store.drivers.find(d => d.id === assignment.driver_id);
      const driverUser = driver ? store.users.find(u => u.id === driver.user_id) : null;
      assignmentDetails = {
        ...assignment,
        vehicle,
        driver: driver ? {
          ...driver,
          full_name: driverUser?.full_name,
          phone_number: driverUser?.phone_number
        } : null
      };
    }

    res.json({
      success: true,
      data: {
        ...reqItem,
        staff: staffUser ? {
          id: staffUser.id,
          full_name: staffUser.full_name,
          phone_number: staffUser.phone_number,
          email: staffUser.email
        } : null,
        assignment: assignmentDetails,
        external_transport: externalTransport
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function createRequest(req, res, next) {
  try {
    const {
      pickup_address,
      pickup_lat,
      pickup_lng,
      destination_address,
      destination_lat,
      destination_lng,
      requested_datetime,
      passenger_count = 1,
      passengers_count,
      purpose,
      special_instructions = '',
      trip_category = 'OFFICIAL',
      project_id,
      pickup_location_source,
      destination_location_source,
      map_estimated_distance_km
    } = req.body;

    const finalPickupAddress = (pickup_address || req.body.pickup_location || '').trim();
    const finalDestAddress = (destination_address || req.body.destination_location || '').trim();
    const finalPickupLat = pickup_lat !== undefined ? pickup_lat : req.body.pickup_latitude;
    const finalPickupLng = pickup_lng !== undefined ? pickup_lng : req.body.pickup_longitude;
    const finalDestLat = destination_lat !== undefined ? destination_lat : req.body.destination_latitude;
    const finalDestLng = destination_lng !== undefined ? destination_lng : req.body.destination_longitude;
    const finalDatetime = requested_datetime || req.body.pickup_datetime || req.body.scheduled_pickup_time || new Date().toISOString();

    if (!finalPickupAddress || finalPickupLat == null || finalPickupLng == null ||
        !finalDestAddress || finalDestLat == null || finalDestLng == null ||
        !purpose) {
      return res.status(400).json({
        success: false,
        error: 'pickup_address, pickup coordinates, destination_address, destination coordinates, and purpose are required'
      });
    }

    const targetProjectId = project_id || req.user.projectId || req.user.project_id || 'proj-eth-a';

    const store = getStore();

    // Generate human-friendly sequential request code: REQ-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const count = store.movement_requests.length + 1;
    const requestCode = `REQ-${currentYear}-${String(count).padStart(4, '0')}`;

    const chosenCategory = ['OFFICIAL', 'PERSONAL'].includes(trip_category?.toUpperCase())
      ? trip_category.toUpperCase()
      : 'OFFICIAL';

    const pickupSrc = ['gps', 'manual', 'map'].includes(String(pickup_location_source || 'gps').toLowerCase())
      ? String(pickup_location_source || 'gps').toLowerCase()
      : 'gps';
    const destSrc = ['manual', 'map'].includes(String(destination_location_source || 'manual').toLowerCase())
      ? String(destination_location_source || 'manual').toLowerCase()
      : 'manual';

    let mapDistance = null;
    if (pickupSrc === 'map' && destSrc === 'map' && map_estimated_distance_km != null) {
      mapDistance = parseFloat(map_estimated_distance_km);
    }

    const newRequest = {
      id: 'req-' + uuidv4().substring(0, 6),
      request_code: requestCode,
      project_id: targetProjectId,
      staff_id: req.user.userId,
      pickup_address: finalPickupAddress,
      pickup_lat: parseFloat(finalPickupLat),
      pickup_lng: parseFloat(finalPickupLng),
      destination_address: finalDestAddress,
      destination_lat: parseFloat(finalDestLat),
      destination_lng: parseFloat(finalDestLng),
      requested_datetime: new Date(finalDatetime),
      passenger_count: parseInt(passengers_count ?? passenger_count, 10) || 1,
      purpose: purpose.trim(),
      special_instructions: special_instructions.trim(),
      trip_category: chosenCategory,
      pickup_location_source: pickupSrc,
      destination_location_source: destSrc,
      map_estimated_distance_km: mapDistance,
      status: 'PENDING',
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    store.movement_requests.unshift(newRequest);

    // Audit log
    await logAudit({
      userId: req.user.userId,
      action: 'MOVEMENT_REQUEST_CREATED',
      entityType: 'MOVEMENT_REQUEST',
      entityId: newRequest.id,
      projectId: targetProjectId,
      newValues: {
        request_code: newRequest.request_code,
        pickup: newRequest.pickup_address,
        destination: newRequest.destination_address
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    // Real-Time Notification via Socket.io to Movement Officers
    try {
      emitToProject(targetProjectId, 'new_movement_request', {
        request: newRequest,
        staffName: req.user.fullName || 'Staff Member'
      });
    } catch (socketErr) {
      // non-fatal
    }

    queueStoreSave();

    const enriched = enrichMovementRequest(store, newRequest);
    res.status(201).json({
      success: true,
      message: 'Movement request submitted successfully',
      data: newRequest,
      request: mapRequestForMobile(enriched)
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const store = getStore();
    const reqItem = store.movement_requests.find(r => r.id === id);

    if (!reqItem) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }

    // Authorization: Staff can only cancel their own request; Movement Officer / Master Person can cancel project requests
    if (req.user.role === 'STAFF' && reqItem.staff_id !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You cannot cancel another user\'s request' });
    }

    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(reqItem.status)) {
      return res.status(400).json({ success: false, error: `Cannot cancel a request that is already ${reqItem.status}` });
    }

    const oldStatus = reqItem.status;
    reqItem.status = 'CANCELLED';
    reqItem.updated_at = new Date();

    // If an assignment exists, free up vehicle and driver
    const assignment = store.trip_assignments.find(t => t.request_id === id && t.status !== 'COMPLETED');
    if (assignment) {
      assignment.status = 'CANCELLED';
      assignment.notes = (assignment.notes ? assignment.notes + ' | ' : '') + `Cancellation reason: ${reason}`;
      assignment.updated_at = new Date();

      const vehicle = store.vehicles.find(v => v.id === assignment.vehicle_id);
      if (vehicle && vehicle.operational_status === 'BUSY') {
        vehicle.operational_status = 'AVAILABLE';
        vehicle.updated_at = new Date();
      }

      const driver = store.drivers.find(d => d.id === assignment.driver_id);
      if (driver && driver.availability_status === 'ON_TRIP') {
        driver.availability_status = 'AVAILABLE';
        driver.updated_at = new Date();
      }
    }

    await logAudit({
      userId: req.user.userId,
      action: 'MOVEMENT_REQUEST_CANCELLED',
      entityType: 'MOVEMENT_REQUEST',
      entityId: reqItem.id,
      projectId: reqItem.project_id,
      oldValues: { status: oldStatus },
      newValues: { status: 'CANCELLED', reason },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'Movement request cancelled successfully', data: reqItem });
  } catch (err) {
    next(err);
  }
}

export async function rejectRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    const store = getStore();
    const reqItem = store.movement_requests.find(r => r.id === id);

    if (!reqItem) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }

    if (reqItem.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Cannot reject request with status '${reqItem.status}'` });
    }

    reqItem.status = 'REJECTED';
    reqItem.rejection_reason = reason.trim();
    reqItem.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'MOVEMENT_REQUEST_REJECTED',
      entityType: 'MOVEMENT_REQUEST',
      entityId: reqItem.id,
      projectId: reqItem.project_id,
      newValues: { status: 'REJECTED', reason: reqItem.rejection_reason },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'Movement request rejected', data: reqItem });
  } catch (err) {
    next(err);
  }
}
