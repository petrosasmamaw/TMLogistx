import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { config } from '../config/index.js';
import { calculateEta, calculateDistanceKm } from '../utils/geo.js';
import { emitToProject, emitToTrip } from '../socket.js';

/**
 * Driver GPS Broadcast Endpoint
 * Ingests live telemetry, updates vehicle coordinates, logs breadcrumb, and broadcasts via WebSockets.
 */
export async function updateGpsLocation(req, res, next) {
  try {
    const {
      vehicle_id,
      trip_assignment_id = null,
      latitude,
      longitude,
      speed = 0.0,
      heading = 0.0
    } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: 'latitude and longitude are required' });
    }

    const store = getStore();

    // Determine target vehicle
    let targetVehicleId = vehicle_id;
    if (!targetVehicleId && req.user.role === 'DRIVER') {
      const driver = store.drivers.find(d => d.user_id === req.user.userId);
      targetVehicleId = driver?.assigned_vehicle_id;
    }

    if (!targetVehicleId) {
      return res.status(400).json({ success: false, error: 'No vehicle associated with this GPS transmission' });
    }

    const vehicle = store.vehicles.find(v => v.id === targetVehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    const now = new Date();
    vehicle.current_lat = parseFloat(latitude);
    vehicle.current_lng = parseFloat(longitude);
    vehicle.last_location_update = now;
    vehicle.updated_at = now;

    // Determine driver
    const driver = store.drivers.find(d => d.assigned_vehicle_id === vehicle.id || d.user_id === req.user.userId);
    if (driver) {
      driver.current_lat = parseFloat(latitude);
      driver.current_lng = parseFloat(longitude);
      driver.last_location_update = now;
      driver.updated_at = now;
    }

    // Save breadcrumb into gps_logs
    const gpsLog = {
      id: Date.now(),
      vehicle_id: vehicle.id,
      driver_id: driver?.id || null,
      trip_assignment_id,
      latitude: vehicle.current_lat,
      longitude: vehicle.current_lng,
      speed: parseFloat(speed) || 0.0,
      heading: parseFloat(heading) || 0.0,
      reported_at: now
    };
    if (!store.gps_logs) store.gps_logs = [];
    store.gps_logs.push(gpsLog);

    // If active trip exists, calculate dynamic ETA to pickup or destination
    let tripEta = null;
    let assignment = null;
    if (trip_assignment_id) {
      assignment = store.trip_assignments.find(t => t.id === trip_assignment_id);
    } else {
      assignment = store.trip_assignments.find(
        t => t.vehicle_id === vehicle.id && 
        ['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'PASSENGER_PICKED_UP', 'IN_TRANSIT'].includes(t.status)
      );
    }

    if (assignment) {
      const request = store.movement_requests.find(r => r.id === assignment.request_id);
      if (request) {
        // If heading to pickup, calculate ETA to pickup
        if (['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP'].includes(assignment.status)) {
          tripEta = calculateEta(vehicle.current_lat, vehicle.current_lng, request.pickup_lat, request.pickup_lng);
        } else {
          // If in transit, calculate ETA to destination
          tripEta = calculateEta(vehicle.current_lat, vehicle.current_lng, request.destination_lat, request.destination_lng);
        }

        // Emit to trip room for staff passenger
        emitToTrip(assignment.id, 'driver_location_updated', {
          assignmentId: assignment.id,
          vehicleId: vehicle.id,
          latitude: vehicle.current_lat,
          longitude: vehicle.current_lng,
          speed: gpsLog.speed,
          heading: gpsLog.heading,
          reportedAt: now,
          tripStatus: assignment.status,
          eta: tripEta
        });
      }
    }

    // Broadcast to project room for Fleet Map & Movement Officer console
    emitToProject(vehicle.project_id, 'vehicle_location_updated', {
      vehicleId: vehicle.id,
      plateNumber: vehicle.plate_number,
      operationalStatus: vehicle.operational_status,
      latitude: vehicle.current_lat,
      longitude: vehicle.current_lng,
      speed: gpsLog.speed,
      heading: gpsLog.heading,
      reportedAt: now,
      driverName: driver ? store.users.find(u => u.id === driver.user_id)?.full_name : null,
      activeTripId: assignment?.id || null
    });

    res.json({
      success: true,
      message: 'GPS location recorded and broadcasted',
      data: {
        vehicle_id: vehicle.id,
        latitude: vehicle.current_lat,
        longitude: vehicle.current_lng,
        last_location_update: now,
        tripEta
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Live Fleet Telemetry Query with Automatic Stale Detection
 */
export async function getLiveFleet(req, res, next) {
  try {
    const store = getStore();
    const { project_id } = req.query;

    let targetProjectIds = [];
    if (req.user.role === 'SYSTEM_ADMIN') {
      targetProjectIds = project_id ? [project_id] : store.projects.map(p => p.id);
    } else if (req.user.role === 'MASTER_PERSON') {
      const assignedIds = store.master_person_projects
        ?.filter(m => m.user_id === req.user.userId)
        .map(m => m.project_id) || [];
      const authorized = [...new Set([req.user.projectId, ...assignedIds].filter(Boolean))];
      targetProjectIds = project_id ? authorized.filter(id => id === project_id) : authorized;
    } else {
      targetProjectIds = [req.user.projectId];
    }

    const now = new Date();
    const staleThresholdMs = config.gpsStaleThresholdMinutes * 60 * 1000;

    const fleet = store.vehicles
      .filter(v => targetProjectIds.includes(v.project_id))
      .map(veh => {
        const lastUpdate = veh.last_location_update ? new Date(veh.last_location_update) : null;
        const diffMs = lastUpdate ? now - lastUpdate : Infinity;
        const isStale = diffMs > staleThresholdMs;
        const staleDurationMins = lastUpdate ? Math.round(diffMs / (60 * 1000)) : null;

        // Visual Map Status: AVAILABLE (green), BUSY (blue), MAINTENANCE (yellow/orange), OFFLINE/STALE (gray)
        let mapStatus = veh.operational_status;
        if (isStale && veh.operational_status !== 'OUT_OF_SERVICE') {
          mapStatus = 'OFFLINE';
        }

        const driver = store.drivers.find(d => d.assigned_vehicle_id === veh.id);
        const driverUser = driver ? store.users.find(u => u.id === driver.user_id) : null;
        const activeTrip = store.trip_assignments.find(
          t => t.vehicle_id === veh.id && 
          ['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP', 'ARRIVED', 'PASSENGER_PICKED_UP', 'IN_TRANSIT'].includes(t.status)
        );

        const lat = veh.current_lat != null ? veh.current_lat : null;
        const lng = veh.current_lng != null ? veh.current_lng : null;

        return {
          id: veh.id,
          plate_number: veh.plate_number,
          make: veh.make,
          model: veh.model,
          capacity: veh.capacity,
          fuel_type: veh.fuel_type,
          operational_status: veh.operational_status,
          map_status: mapStatus,
          latitude: lat,
          longitude: lng,
          current_address: veh.current_address,
          last_location_update: veh.last_location_update,
          is_stale: isStale,
          stale_duration_mins: staleDurationMins,
          driver: driver ? {
            id: driver.id,
            full_name: driverUser?.full_name,
            phone_number: driverUser?.phone_number,
            rating: driver.rating
          } : null,
          active_trip: activeTrip ? {
            id: activeTrip.id,
            request_id: activeTrip.request_id,
            status: activeTrip.status,
            estimated_pickup_time: activeTrip.estimated_pickup_time
          } : null
        };
      })
      .filter((v) => v.latitude != null && v.longitude != null);

    const activeAssignmentStatuses = [
      'ASSIGNED',
      'ACCEPTED',
      'HEADING_TO_PICKUP',
      'ARRIVED',
      'PASSENGER_PICKED_UP',
      'IN_TRANSIT'
    ];

    const driverMarkers = (store.drivers || [])
      .filter((d) => targetProjectIds.includes(d.project_id))
      .map((drv) => {
        const driverUser = store.users.find((u) => u.id === drv.user_id);
        let veh = drv.assigned_vehicle_id
          ? store.vehicles.find((v) => v.id === drv.assigned_vehicle_id)
          : null;

        const activeTrip = store.trip_assignments.find(
          (t) => t.driver_id === drv.id && activeAssignmentStatuses.includes(t.status)
        );

        if (!veh && activeTrip?.vehicle_id) {
          veh = store.vehicles.find((v) => v.id === activeTrip.vehicle_id);
        }

        let latitude = drv.current_lat ?? veh?.current_lat ?? null;
        let longitude = drv.current_lng ?? veh?.current_lng ?? null;
        let position_source = 'driver_gps';

        if (latitude == null || longitude == null) {
          position_source = 'vehicle_gps';
          latitude = veh?.current_lat ?? null;
          longitude = veh?.current_lng ?? null;
        }

        if ((latitude == null || longitude == null) && store.gps_logs?.length) {
          const log = [...store.gps_logs]
            .reverse()
            .find((l) => l.driver_id === drv.id || (veh && l.vehicle_id === veh.id));
          if (log) {
            latitude = log.latitude;
            longitude = log.longitude;
            position_source = 'gps_log';
          }
        }

        let is_approximate = false;
        if (latitude == null || longitude == null) {
          const hash = String(drv.id)
            .split('')
            .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const slot = (hash % 12) * 0.003;
          latitude = 9.02 + slot;
          longitude = 38.75 + slot * 0.85;
          is_approximate = true;
          position_source = 'project_default';
        }

        return {
          id: drv.id,
          user_id: drv.user_id,
          full_name: driverUser?.full_name || 'Driver',
          phone_number: driverUser?.phone_number,
          availability_status: drv.availability_status,
          assigned_vehicle_id: drv.assigned_vehicle_id || veh?.id || null,
          vehicle_plate: veh?.plate_number,
          latitude,
          longitude,
          is_approximate,
          position_source,
          active_trip_id: activeTrip?.id || null
        };
      });

    res.json({
      success: true,
      count: fleet.length,
      driverCount: driverMarkers.length,
      staleThresholdMinutes: config.gpsStaleThresholdMinutes,
      data: fleet,
      drivers: driverMarkers
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Workflow D: Driver Trip Pipeline State Stepper
 * Supported transitions:
 * ASSIGNED -> ACCEPTED -> HEADING_TO_PICKUP -> ARRIVED -> PASSENGER_PICKED_UP -> IN_TRANSIT -> COMPLETED
 */
export async function updateTripStatus(req, res, next) {
  try {
    const { assignmentId } = req.params;
    const {
      status,
      actual_distance_km,
      notes = '',
      distance_source,
      gps_tracked_distance_km,
      map_estimated_distance_km,
      manual_distance_km,
      drive_start_lat,
      drive_start_lng,
      drive_end_lat,
      drive_end_lng
    } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    const store = getStore();
    const assignment = store.trip_assignments.find(t => t.id === assignmentId || t.request_id === assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Trip assignment not found' });
    }

    const request = store.movement_requests.find(r => r.id === assignment.request_id);
    const vehicle = store.vehicles.find(v => v.id === assignment.vehicle_id);
    const driver = store.drivers.find(d => d.id === assignment.driver_id);

    const oldStatus = assignment.status;
    const newStatus = status.toUpperCase();
    const now = new Date();

    assignment.status = newStatus;
    assignment.updated_at = now;
    if (notes) assignment.notes = (assignment.notes ? assignment.notes + ' | ' : '') + notes;

    // Track timestamps based on pipeline state
    if (newStatus === 'ACCEPTED') {
      assignment.actual_start_time = now;
    } else if (newStatus === 'ARRIVED') {
      // Driver arrived at pickup location
      if (!assignment.actual_start_time) assignment.actual_start_time = now;
    } else if (newStatus === 'PASSENGER_PICKED_UP') {
      assignment.actual_pickup_time = now;
      if (request) request.status = 'IN_TRANSIT';
    } else if (newStatus === 'IN_TRANSIT') {
      if (request) request.status = 'IN_TRANSIT';
    } else if (newStatus === 'COMPLETED') {
      assignment.actual_completion_time = now;

      const validSources = ['GPS_TRACKED', 'MAP_ESTIMATE', 'MANUAL'];
      const source = validSources.includes(String(distance_source || '').toUpperCase())
        ? String(distance_source).toUpperCase()
        : null;

      if (gps_tracked_distance_km != null) {
        assignment.gps_tracked_distance_km = parseFloat(gps_tracked_distance_km);
      }
      if (map_estimated_distance_km != null) {
        assignment.map_estimated_distance_km = parseFloat(map_estimated_distance_km);
      }
      if (manual_distance_km != null) {
        assignment.manual_distance_km = parseFloat(manual_distance_km);
      }
      if (drive_start_lat != null) assignment.drive_start_lat = parseFloat(drive_start_lat);
      if (drive_start_lng != null) assignment.drive_start_lng = parseFloat(drive_start_lng);
      if (drive_end_lat != null) assignment.drive_end_lat = parseFloat(drive_end_lat);
      if (drive_end_lng != null) assignment.drive_end_lng = parseFloat(drive_end_lng);
      if (source) assignment.distance_source = source;

      let finalDistanceKm = actual_distance_km != null ? parseFloat(actual_distance_km) : null;
      if (source === 'MANUAL' && manual_distance_km != null) {
        finalDistanceKm = parseFloat(manual_distance_km);
      } else if (source === 'GPS_TRACKED' && gps_tracked_distance_km != null) {
        finalDistanceKm = parseFloat(gps_tracked_distance_km);
      } else if (source === 'MAP_ESTIMATE' && map_estimated_distance_km != null) {
        finalDistanceKm = parseFloat(map_estimated_distance_km);
      }

      if (finalDistanceKm != null && !Number.isNaN(finalDistanceKm) && finalDistanceKm > 0) {
        assignment.actual_distance_km = finalDistanceKm;
        if (vehicle) vehicle.odometer_km += finalDistanceKm;
      }

      if (request) {
        request.status = 'COMPLETED';

        // Workflow: If request was flagged as PERSONAL USE, calculate fuel liability owed to company
        if (request.trip_category === 'PERSONAL') {
          const dist = assignment.actual_distance_km || assignment.estimated_distance_km || 15.0;
          const estLiters = parseFloat((dist / 7.5).toFixed(2)); // 7.5 km per liter
          const rate = 78.50; // ETB per liter
          const amountDue = parseFloat((estLiters * rate).toFixed(2));

          const recoveryRecord = {
            id: 'pfuel-' + uuidv4().substring(0, 6),
            request_id: request.id,
            staff_id: request.staff_id,
            project_id: request.project_id,
            vehicle_id: assignment.vehicle_id,
            distance_km: dist,
            estimated_fuel_liters: estLiters,
            fuel_consumed_liters: estLiters,
            fuel_rate_per_liter: rate,
            total_amount_due: amountDue,
            amount_billed_etb: amountDue,
            currency: 'ETB',
            status: 'PENDING_PAYMENT',
            settlement_status: 'UNPAID',
            paid_at: null,
            settled_at: null,
            payment_reference: null,
            verified_by_user_id: null,
            created_at: now
          };

          if (!store.personal_fuel_recoveries) store.personal_fuel_recoveries = [];
          store.personal_fuel_recoveries.push(recoveryRecord);

          try {
            emitToProject(request.project_id, 'personal_fuel_liability_created', recoveryRecord);
          } catch (e) {}
        }
      }

      // Release resources
      if (vehicle) vehicle.operational_status = 'AVAILABLE';
      if (driver) {
        driver.availability_status = 'AVAILABLE';
        driver.total_trips_completed += 1;
      }
    } else if (newStatus === 'CANCELLED' || newStatus === 'REJECTED') {
      if (request) request.status = newStatus;
      if (vehicle) vehicle.operational_status = 'AVAILABLE';
      if (driver) driver.availability_status = 'AVAILABLE';
    }

    await logAudit({
      userId: req.user.userId,
      action: 'TRIP_STATUS_UPDATED',
      entityType: 'TRIP_ASSIGNMENT',
      entityId: assignment.id,
      projectId: assignment.project_id,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      ipAddress: req.ip || '127.0.0.1'
    });

    // Notify trip room and project room
    emitToTrip(assignment.id, 'trip_status_changed', {
      assignmentId: assignment.id,
      oldStatus,
      newStatus,
      updatedAt: now
    });

    emitToProject(assignment.project_id, 'trip_status_changed', {
      assignmentId: assignment.id,
      vehicleId: vehicle?.id,
      newStatus,
      updatedAt: now
    });

    res.json({
      success: true,
      message: `Trip status updated to '${newStatus}'`,
      data: assignment
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Incident or Delay Reporting by Driver
 */
export async function reportIncident(req, res, next) {
  try {
    const { assignmentId } = req.params;
    const { incident_type, description } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, error: 'Incident description is required' });
    }

    const store = getStore();
    const assignment = store.trip_assignments.find(t => t.id === assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Trip assignment not found' });
    }

    const reportMessage = `[${incident_type || 'INCIDENT'}] ${description} (Reported at ${new Date().toLocaleTimeString()})`;
    assignment.incident_report = reportMessage;
    assignment.updated_at = new Date();

    const vehicle = store.vehicles.find(v => v.id === assignment.vehicle_id);

    // If breakdown, tag vehicle as MAINTENANCE
    if (incident_type?.toUpperCase() === 'BREAKDOWN') {
      if (vehicle) {
        vehicle.operational_status = 'MAINTENANCE';
        vehicle.updated_at = new Date();
      }
    }

    await logAudit({
      userId: req.user.userId,
      action: 'INCIDENT_REPORTED',
      entityType: 'TRIP_ASSIGNMENT',
      entityId: assignment.id,
      projectId: assignment.project_id,
      newValues: { incident: reportMessage },
      ipAddress: req.ip || '127.0.0.1'
    });

    // Alert Movement Officer via project room
    emitToProject(assignment.project_id, 'incident_alert', {
      assignmentId: assignment.id,
      vehiclePlate: vehicle?.plate_number,
      incident: reportMessage
    });

    res.json({
      success: true,
      message: 'Incident reported successfully. Movement Officer has been alerted.',
      data: assignment
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Query Live Tracking Details for a Specific Trip
 */
export async function getTripTracking(req, res, next) {
  try {
    const { assignmentId } = req.params;
    const store = getStore();

    const assignment = store.trip_assignments.find(t => t.id === assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Trip assignment not found' });
    }

    const request = store.movement_requests.find(r => r.id === assignment.request_id);
    const vehicle = store.vehicles.find(v => v.id === assignment.vehicle_id);
    const driver = store.drivers.find(d => d.id === assignment.driver_id);
    const driverUser = driver ? store.users.find(u => u.id === driver.user_id) : null;
    const staffUser = request ? store.users.find(u => u.id === request.staff_id) : null;

    // Calculate live ETA
    let liveEta = null;
    if (vehicle && request) {
      if (['ASSIGNED', 'ACCEPTED', 'HEADING_TO_PICKUP'].includes(assignment.status)) {
        liveEta = calculateEta(vehicle.current_lat, vehicle.current_lng, request.pickup_lat, request.pickup_lng);
      } else {
        liveEta = calculateEta(vehicle.current_lat, vehicle.current_lng, request.destination_lat, request.destination_lng);
      }
    }

    res.json({
      success: true,
      data: {
        assignment,
        request,
        staff: staffUser ? {
          full_name: staffUser.full_name,
          phone_number: staffUser.phone_number
        } : null,
        vehicle: vehicle ? {
          id: vehicle.id,
          plate_number: vehicle.plate_number,
          make: vehicle.make,
          model: vehicle.model,
          current_lat: vehicle.current_lat,
          current_lng: vehicle.current_lng,
          last_location_update: vehicle.last_location_update
        } : null,
        driver: driver ? {
          id: driver.id,
          full_name: driverUser?.full_name,
          phone_number: driverUser?.phone_number,
          rating: driver.rating
        } : null,
        liveEta
      }
    });
  } catch (err) {
    next(err);
  }
}
