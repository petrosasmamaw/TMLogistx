import { v4 as uuidv4 } from 'uuid';
import { getStore, queueStoreSave } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { calculateEta, calculateDistanceKm, estimateDrivingDurationMins } from '../utils/geo.js';
import { emitToProject } from '../socket.js';
import {
  enrichAssignmentForMobile,
  buildTripStatusSocketPayload
} from '../utils/enrichAssignmentForMobile.js';
import { enrichMovementRequest } from '../utils/mobileTripMapper.js';
import { computeDriverPerformance, vehicleStatusLabel } from '../utils/driverStats.js';

/**
 * Workflow C: Intelligent Vehicle Recommendation Algorithm
 * Filters operational vehicles, checks schedules, estimates ETA, and ranks by shortest arrival time.
 */
export async function getRecommendations(req, res, next) {
  try {
    const { requestId } = req.params;
    const store = getStore();

    const request = store.movement_requests.find(r => r.id === requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }

    const project = store.projects.find(p => p.id === request.project_id);
    const allowSharing = project?.allow_vehicle_sharing || false;

    // Filter candidate vehicles from project (or other projects if sharing is enabled)
    let candidateVehicles = store.vehicles.filter(v => {
      if (v.project_id === request.project_id) return true;
      if (allowSharing) {
        const otherProj = store.projects.find(p => p.id === v.project_id);
        return otherProj?.allow_vehicle_sharing;
      }
      return false;
    });

    const requestedTime = new Date(request.requested_datetime).getTime();
    const tripWindowStart = new Date(requestedTime - 30 * 60 * 1000); // 30 mins before
    const tripWindowEnd = new Date(requestedTime + 90 * 60 * 1000);   // 90 mins after

    const rankedVehicles = [];

    for (const vehicle of candidateVehicles) {
      const eligibilityChecks = {
        isOperational: vehicle.operational_status === 'AVAILABLE',
        hasSufficientCapacity: vehicle.capacity >= request.passenger_count,
        hasNoScheduleConflict: true,
        hasAvailableDriver: false
      };

      // Check schedule overlaps
      const hasConflict = store.vehicle_schedules.some(s => {
        if (s.vehicle_id !== vehicle.id || s.status === 'CANCELLED') return false;
        const sStart = new Date(s.start_time).getTime();
        const sEnd = new Date(s.end_time).getTime();
        return (tripWindowStart.getTime() < sEnd && tripWindowEnd.getTime() > sStart);
      });

      if (hasConflict) {
        eligibilityChecks.hasNoScheduleConflict = false;
      }

      // Check assigned driver or available pool driver
      let driver = store.drivers.find(d => d.assigned_vehicle_id === vehicle.id);
      if (!driver) {
        // Pool driver in same project who is free
        driver = store.drivers.find(d => d.project_id === vehicle.project_id && d.availability_status === 'AVAILABLE');
      }

      if (driver && driver.availability_status === 'AVAILABLE') {
        eligibilityChecks.hasAvailableDriver = true;
      }

      const driverUser = driver ? store.users.find(u => u.id === driver.user_id) : null;

      // Calculate distance and driving duration from vehicle's location to pickup point
      const etaDetails = calculateEta(
        vehicle.current_lat || 9.01,
        vehicle.current_lng || 38.76,
        request.pickup_lat,
        request.pickup_lng,
        new Date()
      );

      // Shift and operating schedule check (Normal Day, Night Shift, Weekend)
      const reqDate = new Date(request.requested_datetime);
      const dayOfWeek = reqDate.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const hours = reqDate.getHours();
      const isNight = (hours >= 18 || hours < 6);

      let matchesShift = true;
      let shiftReason = null;
      const vShift = vehicle.shift_type || 'NORMAL_DAY';

      if (vShift !== 'ALL_HOURS') {
        if (isWeekend) {
          if (vShift !== 'WEEKEND' && !vehicle.is_weekend_eligible) {
            matchesShift = false;
            shiftReason = 'Vehicle assigned to weekday shifts only';
          }
        } else if (isNight) {
          if (vShift !== 'NIGHT_SHIFT') {
            matchesShift = false;
            shiftReason = 'Vehicle assigned to normal day shift only (08:00 - 18:00)';
          }
        } else {
          if (vShift === 'NIGHT_SHIFT') {
            matchesShift = false;
            shiftReason = 'Vehicle assigned to night shift only (18:00 - 06:00)';
          } else if (vShift === 'WEEKEND') {
            matchesShift = false;
            shiftReason = 'Vehicle assigned to weekend operations only';
          }
        }
      }

      eligibilityChecks.matchesShift = matchesShift;
      if (!matchesShift) {
        eligibilityChecks.shiftMismatchReason = shiftReason;
      }

      const isEligible = eligibilityChecks.isOperational &&
                         eligibilityChecks.hasSufficientCapacity &&
                         eligibilityChecks.hasNoScheduleConflict &&
                         eligibilityChecks.hasAvailableDriver &&
                         eligibilityChecks.matchesShift;

      rankedVehicles.push({
        vehicle: {
          id: vehicle.id,
          plate_number: vehicle.plate_number,
          make: vehicle.make,
          model: vehicle.model,
          capacity: vehicle.capacity,
          fuel_type: vehicle.fuel_type,
          operational_status: vehicle.operational_status,
          current_address: vehicle.current_address,
          current_lat: vehicle.current_lat,
          current_lng: vehicle.current_lng,
          last_location_update: vehicle.last_location_update,
          project_id: vehicle.project_id,
          shift_type: vehicle.shift_type || 'NORMAL_DAY',
          shift_start_time: vehicle.shift_start_time || '08:00',
          shift_end_time: vehicle.shift_end_time || '18:00',
          is_weekend_eligible: vehicle.is_weekend_eligible || false
        },
        driver: driver ? {
          id: driver.id,
          full_name: driverUser?.full_name || 'Driver',
          phone_number: driverUser?.phone_number,
          rating: driver.rating,
          availability_status: driver.availability_status
        } : null,
        routing: {
          distance_to_pickup_km: etaDetails.distanceKm,
          estimated_driving_duration_mins: etaDetails.durationMins,
          estimated_pickup_time: etaDetails.etaDate
        },
        eligibility: {
          is_eligible: isEligible,
          checks: eligibilityChecks
        }
      });
    }

    // Sort: Eligible vehicles first, ranked by shortest arrival time
    rankedVehicles.sort((a, b) => {
      if (a.eligibility.is_eligible && !b.eligibility.is_eligible) return -1;
      if (!a.eligibility.is_eligible && b.eligibility.is_eligible) return 1;
      return a.routing.estimated_driving_duration_mins - b.routing.estimated_driving_duration_mins;
    });

    const eligibleCount = rankedVehicles.filter(r => r.eligibility.is_eligible).length;

    res.json({
      success: true,
      requestId: request.id,
      requestCode: request.request_code,
      passengerCount: request.passenger_count,
      pickup: {
        address: request.pickup_address,
        lat: request.pickup_lat,
        lng: request.pickup_lng
      },
      destination: {
        address: request.destination_address,
        lat: request.destination_lat,
        lng: request.destination_lng
      },
      eligibleCount,
      suggest_external_transport: eligibleCount === 0,
      recommendations: rankedVehicles
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Workflow C: Atomic Vehicle & Driver Assignment
 */
export async function assignVehicle(req, res, next) {
  try {
    const { request_id, vehicle_id, driver_id, notes = '' } = req.body;

    if (!request_id || !vehicle_id || !driver_id) {
      return res.status(400).json({ success: false, error: 'request_id, vehicle_id, and driver_id are required' });
    }

    const store = getStore();
    const request = store.movement_requests.find(r => r.id === request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Request cannot be assigned. Current status is '${request.status}'` });
    }

    const vehicle = store.vehicles.find(v => v.id === vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    // Atomic Double-Booking Check
    if (vehicle.operational_status !== 'AVAILABLE') {
      return res.status(409).json({
        success: false,
        error: `Double-booking prevention: Vehicle '${vehicle.plate_number}' is currently '${vehicle.operational_status}'`
      });
    }

    const driver = store.drivers.find(d => d.id === driver_id || d.user_id === driver_id);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    if (driver.availability_status !== 'AVAILABLE') {
      return res.status(409).json({
        success: false,
        error: `Double-booking prevention: Driver is currently '${driver.availability_status}'`
      });
    }

    // Calculate routing metrics
    const routing = calculateEta(
      vehicle.current_lat || 9.01,
      vehicle.current_lng || 38.76,
      request.pickup_lat,
      request.pickup_lng
    );

    const tripDistance = calculateDistanceKm(
      request.pickup_lat,
      request.pickup_lng,
      request.destination_lat,
      request.destination_lng
    );

    const newAssignment = {
      id: 'assign-' + uuidv4().substring(0, 6),
      request_id: request.id,
      project_id: request.project_id,
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      assigned_by_user_id: req.user.userId,
      status: 'ASSIGNED',
      rejection_reason: null,
      incident_report: null,
      estimated_pickup_time: routing.etaDate,
      estimated_distance_km: tripDistance,
      estimated_duration_mins: estimateDrivingDurationMins(tripDistance),
      actual_start_time: null,
      actual_pickup_time: null,
      actual_completion_time: null,
      actual_distance_km: null,
      notes: notes.trim(),
      created_at: new Date(),
      updated_at: new Date()
    };

    store.trip_assignments.push(newAssignment);

    // Update statuses
    request.status = 'ASSIGNED';
    request.updated_at = new Date();

    vehicle.operational_status = 'BUSY';
    vehicle.updated_at = new Date();

    driver.availability_status = 'ON_TRIP';
    driver.updated_at = new Date();

    // Create protective reservation lock in vehicle_schedules
    const scheduleLock = {
      id: 'sched-lock-' + uuidv4().substring(0, 6),
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      project_id: request.project_id,
      start_time: new Date(),
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hour protective window
      schedule_type: 'RESERVATION',
      status: 'CONFIRMED',
      notes: `Active Trip Assignment for Request ${request.request_code}`,
      created_at: new Date()
    };
    store.vehicle_schedules.push(scheduleLock);
    queueStoreSave();

    // Audit log
    await logAudit({
      userId: req.user.userId,
      action: 'TRIP_ASSIGNED',
      entityType: 'TRIP_ASSIGNMENT',
      entityId: newAssignment.id,
      projectId: request.project_id,
      newValues: {
        request_code: request.request_code,
        vehicle_plate: vehicle.plate_number,
        driver_id: driver.id
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    // Notify Staff and Driver via WebSockets
    try {
      const driverUser = store.users.find(u => u.id === driver.user_id);
      const enrichedRequest = enrichMovementRequest(store, request);
      emitToProject(request.project_id, 'trip_assigned', {
        requestId: request.id,
        newStatus: newAssignment.status,
        assignment: enrichAssignmentForMobile(store, newAssignment),
        request: enrichedRequest,
        requestCode: request.request_code,
        vehiclePlate: vehicle.plate_number,
        driverName: driverUser?.full_name,
        notifyUserIds: [request.staff_id, driver.user_id, req.user.userId].filter(Boolean)
      });
    } catch (socketErr) {
      // non-fatal
    }

    res.status(201).json({
      success: true,
      message: 'Vehicle and driver assigned successfully',
      data: newAssignment
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Workflow E: Arrange External / Alternative Transport (Uber, RIDE, Local Taxi)
 */
export async function assignExternalTransport(req, res, next) {
  try {
    const {
      request_id,
      provider_name,
      fare_amount,
      currency = 'ETB',
      reason,
      receipt_url = null,
      notes = ''
    } = req.body;

    if (!request_id || !provider_name || fare_amount === undefined || !reason) {
      return res.status(400).json({
        success: false,
        error: 'request_id, provider_name, fare_amount, and reason are required'
      });
    }

    const store = getStore();
    const request = store.movement_requests.find(r => r.id === request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Cannot arrange external transport for request with status '${request.status}'`
      });
    }

    const externalRecord = {
      id: 'ext-' + uuidv4().substring(0, 6),
      request_id: request.id,
      project_id: request.project_id,
      arranged_by_user_id: req.user.userId,
      staff_id: request.staff_id,
      provider_name: provider_name.trim(),
      fare_amount: parseFloat(fare_amount),
      currency: currency.toUpperCase(),
      ride_date: new Date(),
      reason: reason.trim(),
      receipt_url,
      has_receipt: Boolean(receipt_url),
      is_approved: true,
      notes: notes.trim(),
      created_at: new Date()
    };

    store.external_transports.push(externalRecord);

    // Request is marked completed via external transport
    request.status = 'COMPLETED';
    request.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'EXTERNAL_TRANSPORT_ARRANGED',
      entityType: 'EXTERNAL_TRANSPORT',
      entityId: externalRecord.id,
      projectId: request.project_id,
      newValues: {
        provider: externalRecord.provider_name,
        fare: externalRecord.fare_amount,
        currency: externalRecord.currency,
        reason: externalRecord.reason
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({
      success: true,
      message: 'External alternative transport recorded successfully',
      data: externalRecord
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Workflow F: Reassign Active Trip to Different Vehicle and/or Driver
 * Allows changing vehicle only, driver only, or both
 */
export async function reassignTrip(req, res, next) {
  try {
    const assignment_id = req.body.assignment_id || req.body.assignmentId;
    const request_id = req.body.request_id || req.body.requestId;
    const new_vehicle_id = req.body.new_vehicle_id || req.body.vehicle_id;
    const new_driver_id = req.body.new_driver_id || req.body.driver_id;
    const reason = req.body.reason || 'Operational Reassignment';

    if ((!assignment_id && !request_id) || (!new_vehicle_id && !new_driver_id)) {
      return res.status(400).json({
        success: false,
        error: 'assignment_id (or request_id) and at least one of (vehicle_id, driver_id) are required'
      });
    }

    const store = getStore();
    let assignment = null;
    if (assignment_id) {
      assignment = store.trip_assignments.find(t => t.id === assignment_id);
    } else if (request_id) {
      assignment = store.trip_assignments.find(t => t.request_id === request_id && t.status !== 'CANCELLED');
    }

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Trip assignment not found' });
    }

    const oldValues = { vehicle_id: assignment.vehicle_id, driver_id: assignment.driver_id };

    // Reassign Vehicle if requested
    if (new_vehicle_id && new_vehicle_id !== assignment.vehicle_id) {
      const newVehicle = store.vehicles.find(v => v.id === new_vehicle_id);
      if (!newVehicle || newVehicle.operational_status !== 'AVAILABLE') {
        return res.status(409).json({ success: false, error: `New vehicle is not available (current: '${newVehicle?.operational_status}')` });
      }

      const oldVehicle = store.vehicles.find(v => v.id === assignment.vehicle_id);
      if (oldVehicle && oldVehicle.operational_status === 'BUSY') {
        oldVehicle.operational_status = 'AVAILABLE';
        oldVehicle.updated_at = new Date();
      }

      newVehicle.operational_status = 'BUSY';
      newVehicle.updated_at = new Date();
      assignment.vehicle_id = newVehicle.id;
    }

    // Reassign Driver if requested
    if (new_driver_id && new_driver_id !== assignment.driver_id) {
      const newDriver = store.drivers.find(d => d.id === new_driver_id);
      if (!newDriver || newDriver.availability_status !== 'AVAILABLE') {
        return res.status(409).json({ success: false, error: `New driver is not available (current: '${newDriver?.availability_status}')` });
      }

      const oldDriver = store.drivers.find(d => d.id === assignment.driver_id);
      if (oldDriver && oldDriver.availability_status === 'ON_TRIP') {
        oldDriver.availability_status = 'AVAILABLE';
        oldDriver.updated_at = new Date();
      }

      newDriver.availability_status = 'ON_TRIP';
      newDriver.updated_at = new Date();
      assignment.driver_id = newDriver.id;
    }

    assignment.notes = (assignment.notes ? assignment.notes + ' | ' : '') + `Reassigned: ${reason}`;
    assignment.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'TRIP_REASSIGNED',
      entityType: 'TRIP_ASSIGNMENT',
      entityId: assignment.id,
      projectId: assignment.project_id,
      oldValues,
      newValues: { new_vehicle_id: assignment.vehicle_id, new_driver_id: assignment.driver_id, reason },
      ipAddress: req.ip || '127.0.0.1'
    });

    try {
      emitToProject(
        assignment.project_id,
        'trip_reassigned',
        buildTripStatusSocketPayload(store, assignment, assignment.status, {
          vehicleId: assignment.vehicle_id,
          driverId: assignment.driver_id,
          reason
        })
      );
    } catch (e) {}

    res.json({
      success: true,
      message: 'Trip successfully reassigned',
      data: assignment
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Cancel an active trip assignment
 * Frees vehicle and driver back to AVAILABLE, resets request to PENDING or CANCELLED
 */
export async function cancelTripAssignment(req, res, next) {
  try {
    const assignment_id = req.body.assignment_id || req.body.assignmentId;
    const request_id = req.body.request_id || req.body.requestId;
    const { reason = 'Cancelled by coordinator', reset_request_to = 'PENDING' } = req.body;

    if (!assignment_id && !request_id) {
      return res.status(400).json({ success: false, error: 'assignment_id or request_id is required' });
    }

    const store = getStore();
    let assignment = null;
    if (assignment_id) {
      assignment = store.trip_assignments.find(t => t.id === assignment_id);
    } else if (request_id) {
      assignment = store.trip_assignments.find(t => t.request_id === request_id && t.status !== 'CANCELLED');
    }

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Trip assignment not found' });
    }

    const request = store.movement_requests.find(r => r.id === assignment.request_id);
    const vehicle = store.vehicles.find(v => v.id === assignment.vehicle_id);
    const driver = store.drivers.find(d => d.id === assignment.driver_id);

    // Free resources
    if (vehicle && vehicle.operational_status === 'BUSY') {
      vehicle.operational_status = 'AVAILABLE';
      vehicle.updated_at = new Date();
    }
    if (driver && driver.availability_status === 'ON_TRIP') {
      driver.availability_status = 'AVAILABLE';
      driver.updated_at = new Date();
    }

    assignment.status = 'CANCELLED';
    assignment.notes = (assignment.notes ? assignment.notes + ' | ' : '') + `Cancelled: ${reason}`;
    assignment.updated_at = new Date();

    if (request) {
      request.status = reset_request_to === 'CANCELLED' ? 'CANCELLED' : 'PENDING';
      request.updated_at = new Date();
    }

    await logAudit({
      userId: req.user.userId,
      action: 'TRIP_ASSIGNMENT_CANCELLED',
      entityType: 'TRIP_ASSIGNMENT',
      entityId: assignment.id,
      projectId: assignment.project_id,
      newValues: { reason, reset_request_to },
      ipAddress: req.ip || '127.0.0.1'
    });

    try {
      emitToProject(assignment.project_id, 'trip_assignment_cancelled', {
        assignmentId: assignment.id,
        requestId: request?.id,
        requestCode: request?.request_code,
        reason
      });
    } catch (e) {}

    res.json({
      success: true,
      message: 'Trip assignment cancelled. Vehicle and driver restored to AVAILABLE.',
      data: { assignment, request }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Workflow E.1: Controller Authorizes & Dispatches External Transport (Uber / RIDE) for Staff
 * Coordinator calls/arranges taxi and sends driver & car details to the staff app
 */
export async function authorizeExternalTransport(req, res, next) {
  try {
    const {
      request_id = req.params.id || req.body.id,
      provider = 'RIDE (8294)',
      notes = '',
      coordinator_booked = true
    } = req.body;

    const external_driver_name = req.body.external_driver_name || req.body.driver_name || '';
    const external_driver_phone = req.body.external_driver_phone || req.body.driver_phone || '';
    const external_vehicle_plate = req.body.external_vehicle_plate || req.body.plate_number || '';
    const external_vehicle_model = req.body.external_vehicle_model || req.body.vehicle_model || '';
    const external_booking_ref = req.body.external_booking_ref || req.body.booking_ref || '';

    if (!request_id) {
      return res.status(400).json({ success: false, error: 'request_id is required' });
    }

    const store = getStore();
    const request = store.movement_requests.find(r => r.id === request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Cannot authorize external transport for request with status '${request.status}'`
      });
    }

    request.status = 'EXTERNAL_AUTHORIZED';
    request.external_authorized = true;
    request.external_provider = provider;
    request.external_status = 'AUTHORIZED';
    request.coordinator_booked_uber = Boolean(coordinator_booked);
    request.external_driver_name = external_driver_name ? String(external_driver_name).trim() : '';
    request.external_driver_phone = external_driver_phone ? String(external_driver_phone).trim() : '';
    request.external_vehicle_plate = external_vehicle_plate ? String(external_vehicle_plate).trim() : '';
    request.external_vehicle_model = external_vehicle_model ? String(external_vehicle_model).trim() : '';
    request.external_booking_ref = external_booking_ref ? String(external_booking_ref).trim() : '';
    request.external_receipt_notes = notes;
    request.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'EXTERNAL_TRANSPORT_AUTHORIZED',
      entityType: 'MOVEMENT_REQUEST',
      entityId: request.id,
      projectId: request.project_id,
      newValues: {
        provider,
        staff_id: request.staff_id,
        request_code: request.request_code,
        coordinator_booked,
        external_driver_name: request.external_driver_name,
        external_vehicle_plate: request.external_vehicle_plate,
        notes
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    try {
      emitToProject(request.project_id, 'external_transport_authorized', {
        requestId: request.id,
        requestCode: request.request_code,
        staffId: request.staff_id,
        provider,
        coordinator_booked: request.coordinator_booked_uber,
        external_driver_name: request.external_driver_name,
        external_driver_phone: request.external_driver_phone,
        external_vehicle_plate: request.external_vehicle_plate,
        external_vehicle_model: request.external_vehicle_model,
        external_booking_ref: request.external_booking_ref,
        notes
      });
    } catch (socketErr) {
      // non-fatal
    }

    res.json({
      success: true,
      message: `External transport (${provider}) authorized for staff member`,
      data: request
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Workflow E.2: Staff Starts External Ride (Captures start time and location)
 */
export async function startExternalRide(req, res, next) {
  try {
    const { request_id, start_lat, start_lng, start_address } = req.body;

    if (!request_id) {
      return res.status(400).json({ success: false, error: 'request_id is required' });
    }

    const store = getStore();
    const request = store.movement_requests.find(r => r.id === request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }

    // Role check: Staff must be requester, or user is controller/admin
    if (req.user.role === 'STAFF' && request.staff_id !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only start your own authorized ride' });
    }

    if (request.status !== 'EXTERNAL_AUTHORIZED' && request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `Cannot start external ride. Current request status is '${request.status}'`
      });
    }

    const startLat = start_lat != null ? parseFloat(start_lat) : request.pickup_lat;
    const startLng = start_lng != null ? parseFloat(start_lng) : request.pickup_lng;

    request.status = 'IN_TRANSIT';
    request.external_status = 'IN_TRANSIT';
    request.external_start_lat = startLat;
    request.external_start_lng = startLng;
    request.external_start_time = new Date();
    if (start_address) {
      request.pickup_address = start_address;
    }
    request.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'EXTERNAL_RIDE_STARTED',
      entityType: 'MOVEMENT_REQUEST',
      entityId: request.id,
      projectId: request.project_id,
      newValues: {
        request_code: request.request_code,
        start_time: request.external_start_time,
        start_lat: startLat,
        start_lng: startLng
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    try {
      emitToProject(request.project_id, 'external_ride_started', {
        requestId: request.id,
        requestCode: request.request_code,
        staffId: request.staff_id,
        startTime: request.external_start_time
      });
    } catch (socketErr) {
      // non-fatal
    }

    res.json({
      success: true,
      message: 'External ride started successfully',
      data: request
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Workflow E.3: Staff Ends External Ride (Calculates distance, logs amount paid, completes trip)
 */
export async function completeExternalRide(req, res, next) {
  try {
    const {
      request_id,
      end_lat,
      end_lng,
      end_address,
      fare_amount,
      currency = 'ETB',
      provider_name,
      receipt_notes = ''
    } = req.body;

    if (!request_id || fare_amount === undefined || fare_amount === null) {
      return res.status(400).json({ success: false, error: 'request_id and fare_amount are required' });
    }

    const store = getStore();
    const request = store.movement_requests.find(r => r.id === request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }

    // Role check: Staff must be requester, or user is controller/admin
    if (req.user.role === 'STAFF' && request.staff_id !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only complete your own authorized ride' });
    }

    if (request.status !== 'IN_TRANSIT' && request.status !== 'EXTERNAL_AUTHORIZED') {
      return res.status(400).json({
        success: false,
        error: `Cannot complete ride. Current status is '${request.status}'`
      });
    }

    const startLat = request.external_start_lat || request.pickup_lat;
    const startLng = request.external_start_lng || request.pickup_lng;
    const endLatitude = end_lat != null ? parseFloat(end_lat) : request.destination_lat;
    const endLongitude = end_lng != null ? parseFloat(end_lng) : request.destination_lng;

    // Calculate actual distance traveled
    const distanceKm = calculateDistanceKm(startLat, startLng, endLatitude, endLongitude);
    const cost = parseFloat(fare_amount) || 0.0;
    const now = new Date();

    request.status = 'COMPLETED';
    request.external_status = 'COMPLETED';
    request.external_end_lat = endLatitude;
    request.external_end_lng = endLongitude;
    request.external_end_time = now;
    request.external_distance_km = distanceKm;
    request.external_cost = cost;
    request.external_currency = (currency || 'ETB').toUpperCase();
    request.external_receipt_notes = receipt_notes;
    if (end_address) {
      request.destination_address = end_address;
    }
    request.updated_at = now;

    // Record in external_transports ledger
    const externalRecord = {
      id: 'ext-' + uuidv4().substring(0, 6),
      request_id: request.id,
      project_id: request.project_id,
      arranged_by_user_id: req.user.userId,
      staff_id: request.staff_id,
      provider_name: provider_name || request.external_provider || 'Uber / RIDE',
      fare_amount: cost,
      currency: request.external_currency,
      ride_date: now,
      start_time: request.external_start_time || now,
      end_time: now,
      distance_km: distanceKm,
      reason: 'Staff authorized external ride',
      receipt_url: null,
      has_receipt: Boolean(receipt_notes),
      is_approved: true,
      notes: receipt_notes,
      created_at: now
    };

    store.external_transports.push(externalRecord);

    await logAudit({
      userId: req.user.userId,
      action: 'EXTERNAL_RIDE_COMPLETED',
      entityType: 'MOVEMENT_REQUEST',
      entityId: request.id,
      projectId: request.project_id,
      newValues: {
        request_code: request.request_code,
        fare_amount: cost,
        currency: request.external_currency,
        distance_km: distanceKm,
        notes: receipt_notes
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    try {
      emitToProject(request.project_id, 'external_ride_completed', {
        requestId: request.id,
        requestCode: request.request_code,
        fareAmount: cost,
        currency: request.external_currency,
        distanceKm
      });
    } catch (socketErr) {
      // non-fatal
    }

    res.json({
      success: true,
      message: `External ride completed successfully. Distance: ${distanceKm} km, Fare: ${cost} ${request.external_currency}`,
      data: {
        request,
        external_transport: externalRecord
      }
    });
  } catch (err) {
    next(err);
  }
}

/** Driver mobile: performance KPIs and completed movement log (real trip data) */
export async function getDriverStats(req, res, next) {
  try {
    const store = getStore();
    const driver = store.drivers.find((d) => d.user_id === req.user.userId);
    const stats = computeDriverPerformance(store, driver);
    const vehicleLabel = stats.vehicle
      ? vehicleStatusLabel(stats.vehicle.operational_status)
      : null;

    res.json({
      success: true,
      data: {
        ...stats,
        vehicle_status_label: vehicleLabel
      }
    });
  } catch (err) {
    next(err);
  }
}

/** Driver mobile: active and recent fleet assignments */
export async function getDriverAssignments(req, res, next) {
  try {
    const store = getStore();
    const driver = store.drivers.find((d) => d.user_id === req.user.userId);
    if (!driver) {
      return res.json({ success: true, count: 0, data: [], assignments: [] });
    }

    const activeStatuses = ['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'PASSENGER_PICKED_UP', 'IN_TRANSIT'];
    const assignments = (store.trip_assignments || [])
      .filter((a) => a.driver_id === driver.id && activeStatuses.includes(a.status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((a) => enrichAssignmentForMobile(store, a));

    res.json({ success: true, count: assignments.length, data: assignments, assignments });
  } catch (err) {
    next(err);
  }
}

export async function acceptDriverAssignment(req, res, next) {
  try {
    const { assignment_id } = req.body;
    const store = getStore();
    const driver = store.drivers.find((d) => d.user_id === req.user.userId);
    const assignment = store.trip_assignments.find((a) => a.id === assignment_id);
    if (!assignment || !driver || assignment.driver_id !== driver.id) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    assignment.status = 'ACCEPTED';
    assignment.updated_at = new Date();
    queueStoreSave();
    try {
      emitToProject(assignment.project_id, 'trip_status_changed', buildTripStatusSocketPayload(
        store,
        assignment,
        'ACCEPTED'
      ));
    } catch {
      /* non-fatal */
    }
    res.json({ success: true, data: enrichAssignmentForMobile(store, assignment) });
  } catch (err) {
    next(err);
  }
}

/** Driver declines assignment — frees vehicle/driver and returns request to PENDING for coordinator */
export async function rejectDriverAssignment(req, res, next) {
  try {
    const assignment_id = req.body.assignment_id || req.body.assignmentId;
    const { reason = 'Declined by driver' } = req.body;

    if (!assignment_id) {
      return res.status(400).json({ success: false, error: 'assignment_id is required' });
    }

    const store = getStore();
    const driver = store.drivers.find((d) => d.user_id === req.user.userId);
    const assignment = store.trip_assignments.find((a) => a.id === assignment_id);

    if (!assignment || !driver || assignment.driver_id !== driver.id) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    if (!['ASSIGNED', 'ACCEPTED'].includes(assignment.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot decline assignment in status '${assignment.status}'`
      });
    }

    const request = store.movement_requests.find((r) => r.id === assignment.request_id);
    const vehicle = store.vehicles.find((v) => v.id === assignment.vehicle_id);

    if (vehicle && vehicle.operational_status === 'BUSY') {
      vehicle.operational_status = 'AVAILABLE';
      vehicle.updated_at = new Date();
    }
    if (driver.availability_status === 'ON_TRIP') {
      driver.availability_status = 'AVAILABLE';
      driver.updated_at = new Date();
    }

    assignment.status = 'REJECTED';
    assignment.rejection_reason = String(reason).trim();
    assignment.updated_at = new Date();

    if (request) {
      request.status = 'PENDING';
      request.updated_at = new Date();
    }

    try {
      emitToProject(request?.project_id, 'driver_assignment_rejected', {
        assignmentId: assignment.id,
        requestId: request?.id,
        reason: assignment.rejection_reason
      });
    } catch {
      /* non-fatal */
    }

    res.json({
      success: true,
      message: 'Assignment declined. Coordinator can assign another driver.',
      data: enrichAssignmentForMobile(store, assignment)
    });
  } catch (err) {
    next(err);
  }
}

/** Staff starts fleet trip meter at pickup (internal vehicle, not Uber/RIDE) */
export async function startFleetTripMeter(req, res, next) {
  try {
    const { request_id, start_lat, start_lng } = req.body;
    if (!request_id) {
      return res.status(400).json({ success: false, error: 'request_id is required' });
    }

    const store = getStore();
    const request = store.movement_requests.find((r) => r.id === request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }
    if (req.user.role === 'STAFF' && request.staff_id !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const assignment = store.trip_assignments.find((t) => t.request_id === request.id);
    if (!assignment) {
      return res.status(400).json({ success: false, error: 'No fleet assignment on this request yet' });
    }
    if (!['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'PASSENGER_PICKED_UP'].includes(assignment.status)) {
      return res.status(400).json({ success: false, error: `Cannot start meter while assignment is ${assignment.status}` });
    }

    const startLat = start_lat != null ? parseFloat(start_lat) : request.pickup_lat;
    const startLng = start_lng != null ? parseFloat(start_lng) : request.pickup_lng;

    assignment.staff_meter_start_lat = startLat;
    assignment.staff_meter_start_lng = startLng;
    assignment.staff_meter_started_at = new Date();
    assignment.status = 'IN_TRANSIT';
    assignment.actual_start_time = assignment.actual_start_time || new Date();
    assignment.updated_at = new Date();

    request.status = 'IN_TRANSIT';
    request.updated_at = new Date();

    queueStoreSave();
    emitToProject(
      request.project_id,
      'fleet_trip_started',
      buildTripStatusSocketPayload(store, assignment, 'IN_TRANSIT', {
        requestId: request.id
      })
    );

    res.json({ success: true, message: 'Trip distance counter started', data: { request, assignment } });
  } catch (err) {
    next(err);
  }
}

/** Staff ends fleet trip meter at destination; records distance */
export async function completeFleetTripMeter(req, res, next) {
  try {
    const { request_id, end_lat, end_lng } = req.body;
    if (!request_id) {
      return res.status(400).json({ success: false, error: 'request_id is required' });
    }

    const store = getStore();
    const request = store.movement_requests.find((r) => r.id === request_id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Movement request not found' });
    }
    if (req.user.role === 'STAFF' && request.staff_id !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const assignment = store.trip_assignments.find((t) => t.request_id === request.id);
    if (!assignment || !assignment.staff_meter_started_at) {
      return res.status(400).json({ success: false, error: 'Start the trip counter at pickup before ending' });
    }

    const endLat = end_lat != null ? parseFloat(end_lat) : request.destination_lat;
    const endLng = end_lng != null ? parseFloat(end_lng) : request.destination_lng;
    const distanceKm = calculateDistanceKm(
      assignment.staff_meter_start_lat,
      assignment.staff_meter_start_lng,
      endLat,
      endLng
    );

    assignment.staff_meter_end_lat = endLat;
    assignment.staff_meter_end_lng = endLng;
    assignment.staff_meter_ended_at = new Date();
    assignment.actual_distance_km = distanceKm;
    assignment.distance_source = 'STAFF_METER';
    assignment.status = 'COMPLETED';
    assignment.actual_completion_time = new Date();
    assignment.updated_at = new Date();

    request.status = 'COMPLETED';
    request.updated_at = new Date();

    const vehicle = store.vehicles.find((v) => v.id === assignment.vehicle_id);
    const driver = store.drivers.find((d) => d.id === assignment.driver_id);
    if (vehicle) {
      vehicle.operational_status = 'AVAILABLE';
      vehicle.odometer_km = (vehicle.odometer_km || 0) + distanceKm;
      vehicle.updated_at = new Date();
    }
    if (driver) {
      driver.availability_status = 'AVAILABLE';
      driver.total_trips_completed = (driver.total_trips_completed || 0) + 1;
      driver.updated_at = new Date();
    }

    res.json({
      success: true,
      message: `Trip completed. Recorded distance: ${distanceKm} km`,
      data: { request, assignment, distance_km: distanceKm }
    });
  } catch (err) {
    next(err);
  }
}

