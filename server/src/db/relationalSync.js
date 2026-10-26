/**
 * Mirror in-memory store into PostgreSQL tables (users, trips, fleet, etc.)
 * so data survives restarts even if JSON snapshot load/save fails.
 */

function toTs(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toDate(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && v.length >= 10) return v.slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toTime(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && /^\d{2}:\d{2}/.test(v)) return v.slice(0, 8);
  return null;
}

async function upsertCountries(client, countries = []) {
  for (const c of countries) {
    await client.query(
      `INSERT INTO countries (id, name, code, currency, is_active, created_at)
       VALUES ($1,$2,$3,$4,COALESCE($5,true),COALESCE($6::timestamptz,NOW()))
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, code = EXCLUDED.code, currency = EXCLUDED.currency,
         is_active = EXCLUDED.is_active, updated_at = NOW()`,
      [c.id, c.name, c.code, c.currency || 'ETB', c.is_active, toTs(c.created_at)]
    );
  }
}

async function upsertProjects(client, projects = []) {
  for (const p of projects) {
    if (!p.country_id) continue;
    await client.query(
      `INSERT INTO projects (id, country_id, name, code, description, allow_vehicle_sharing, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,false),COALESCE($7,true),COALESCE($8::timestamptz,NOW()))
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, code = EXCLUDED.code, description = EXCLUDED.description,
         allow_vehicle_sharing = EXCLUDED.allow_vehicle_sharing, is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [
        p.id,
        p.country_id,
        p.name,
        p.code,
        p.description || null,
        p.allow_vehicle_sharing,
        p.is_active,
        toTs(p.created_at)
      ]
    );
  }
}

async function upsertProjectSites(client, sites = []) {
  for (const s of sites) {
    if (!s.project_id) continue;
    await client.query(
      `INSERT INTO project_sites (
         id, project_id, country_id, name, short_label, display_order,
         lead_logistics_coordinator_user_id, lead_movement_officer_user_id, is_active, created_at
       ) VALUES ($1,$2,$3,$4,$5,COALESCE($6,0),$7,$8,COALESCE($9,true),COALESCE($10::timestamptz,NOW()))
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, short_label = EXCLUDED.short_label, is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [
        s.id,
        s.project_id,
        s.country_id || null,
        s.name,
        s.short_label || null,
        s.display_order,
        s.lead_logistics_coordinator_user_id || null,
        s.lead_movement_officer_user_id || null,
        s.is_active,
        toTs(s.created_at)
      ]
    );
  }
}

async function upsertUsers(client, users = []) {
  for (const u of users) {
    if (!u.email || !u.password_hash) continue;
    await client.query(
      `INSERT INTO users (
         id, email, password_hash, full_name, phone_number, role, country_id, project_id,
         language_preference, avatar_url, is_active, last_login_at, site_id,
         master_active_project_id, master_active_site_id, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'en'),$10,COALESCE($11,true),$12::timestamptz,$13,$14,$15,COALESCE($16::timestamptz,NOW()))
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name,
         phone_number = EXCLUDED.phone_number, role = EXCLUDED.role, country_id = EXCLUDED.country_id,
         project_id = EXCLUDED.project_id, language_preference = EXCLUDED.language_preference,
         is_active = EXCLUDED.is_active, last_login_at = EXCLUDED.last_login_at,
         site_id = EXCLUDED.site_id, master_active_project_id = EXCLUDED.master_active_project_id,
         master_active_site_id = EXCLUDED.master_active_site_id, updated_at = NOW()`,
      [
        u.id,
        u.email.trim().toLowerCase(),
        u.password_hash,
        u.full_name,
        u.phone_number || null,
        u.role,
        u.country_id || null,
        u.project_id || null,
        u.language_preference,
        u.avatar_url || null,
        u.is_active,
        toTs(u.last_login_at),
        u.site_id || null,
        u.master_active_project_id || null,
        u.master_active_site_id || null,
        toTs(u.created_at)
      ]
    );
  }
}

async function upsertMasterPersonProjects(client, rows = []) {
  for (const m of rows) {
    await client.query(
      `INSERT INTO master_person_projects (id, user_id, project_id, assigned_at)
       VALUES ($1,$2,$3,COALESCE($4::timestamptz,NOW()))
       ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, project_id = EXCLUDED.project_id`,
      [m.id, m.user_id, m.project_id, toTs(m.assigned_at)]
    );
  }
}

async function upsertVehicles(client, vehicles = []) {
  for (const v of vehicles) {
    if (!v.project_id || !v.plate_number) continue;
    await client.query(
      `INSERT INTO vehicles (
         id, project_id, plate_number, make, model, year, capacity, fuel_type, operational_status,
         current_lat, current_lng, current_address, last_location_update, odometer_km,
         shift_type, shift_start_time, shift_end_time, is_weekend_eligible, site_id, created_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,COALESCE($7,4),COALESCE($8,'Diesel'),COALESCE($9,'AVAILABLE'),
         $10,$11,$12,$13::timestamptz,COALESCE($14,0),COALESCE($15,'NORMAL_DAY'),
         COALESCE($16::time,'08:00'),COALESCE($17::time,'18:00'),COALESCE($18,false),$19,
         COALESCE($20::timestamptz,NOW())
       )
       ON CONFLICT (id) DO UPDATE SET
         operational_status = EXCLUDED.operational_status, current_lat = EXCLUDED.current_lat,
         current_lng = EXCLUDED.current_lng, current_address = EXCLUDED.current_address,
         last_location_update = EXCLUDED.last_location_update, site_id = EXCLUDED.site_id,
         updated_at = NOW()`,
      [
        v.id,
        v.project_id,
        v.plate_number,
        v.make || 'Unknown',
        v.model || 'Unknown',
        v.year || null,
        v.capacity,
        v.fuel_type,
        v.operational_status || v.status,
        v.current_lat ?? null,
        v.current_lng ?? null,
        v.current_address || null,
        toTs(v.last_location_update),
        v.odometer_km,
        v.shift_type,
        toTime(v.shift_start_time),
        toTime(v.shift_end_time),
        v.is_weekend_eligible,
        v.site_id || null,
        toTs(v.created_at)
      ]
    );
  }
}

async function upsertDrivers(client, drivers = []) {
  for (const d of drivers) {
    if (!d.user_id || !d.project_id) continue;
    await client.query(
      `INSERT INTO drivers (
         id, user_id, project_id, license_number, license_category, license_expiry,
         assigned_vehicle_id, availability_status, shift_type, shift_start_time, shift_end_time,
         total_trips_completed, rating, created_at
       ) VALUES (
         $1,$2,$3,COALESCE($4,'PENDING'),COALESCE($5,'Public / 3rd Grade'),$6::date,
         $7,COALESCE($8,'AVAILABLE'),COALESCE($9,'NORMAL_DAY'),COALESCE($10::time,'08:00'),COALESCE($11::time,'18:00'),
         COALESCE($12,0),COALESCE($13,5.0),COALESCE($14::timestamptz,NOW())
       )
       ON CONFLICT (id) DO UPDATE SET
         license_number = EXCLUDED.license_number,
         shift_type = EXCLUDED.shift_type,
         shift_start_time = EXCLUDED.shift_start_time,
         shift_end_time = EXCLUDED.shift_end_time,
         assigned_vehicle_id = EXCLUDED.assigned_vehicle_id,
         availability_status = EXCLUDED.availability_status,
         project_id = EXCLUDED.project_id,
         updated_at = NOW()`,
      [
        d.id,
        d.user_id,
        d.project_id,
        d.license_number,
        d.license_category,
        toDate(d.license_expiry),
        d.assigned_vehicle_id || null,
        d.availability_status,
        d.shift_type || 'NORMAL_DAY',
        toTime(d.shift_start_time),
        toTime(d.shift_end_time),
        d.total_trips_completed,
        d.rating,
        toTs(d.created_at)
      ]
    );
  }
}

async function upsertMovementRequests(client, requests = []) {
  for (const r of requests) {
    if (!r.id || !r.project_id || !r.staff_id) continue;
    const pickupLat = r.pickup_lat ?? 0;
    const pickupLng = r.pickup_lng ?? 0;
    const destLat = r.destination_lat ?? 0;
    const destLng = r.destination_lng ?? 0;
    await client.query(
      `INSERT INTO movement_requests (
         id, request_code, project_id, staff_id, pickup_address, pickup_lat, pickup_lng,
         destination_address, destination_lat, destination_lng, requested_datetime,
         passenger_count, purpose, special_instructions, trip_category, status, rejection_reason,
         external_authorized, external_provider, external_status, coordinator_booked_uber,
         external_driver_name, external_driver_phone, external_vehicle_plate, external_vehicle_model,
         external_booking_ref, external_start_lat, external_start_lng, external_start_time,
         external_end_lat, external_end_lng, external_end_time, external_distance_km,
         external_cost, external_currency, external_receipt_notes, created_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11::timestamptz,NOW()),
         COALESCE($12,1),COALESCE($13,''),$14,COALESCE($15,'OFFICIAL'),COALESCE($16,'PENDING'),$17,
         COALESCE($18,false),$19,$20,COALESCE($21,false),$22,$23,$24,$25,$26,$27,$28,$29::timestamptz,
         $30,$31,$32::timestamptz,$33,$34,COALESCE($35,'ETB'),$36,COALESCE($37::timestamptz,NOW())
       )
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status, rejection_reason = EXCLUDED.rejection_reason,
         external_status = EXCLUDED.external_status, coordinator_booked_uber = EXCLUDED.coordinator_booked_uber,
         external_cost = EXCLUDED.external_cost, updated_at = NOW()`,
      [
        r.id,
        r.request_code || `REQ-${r.id}`,
        r.project_id,
        r.staff_id,
        r.pickup_address || '—',
        pickupLat,
        pickupLng,
        r.destination_address || '—',
        destLat,
        destLng,
        toTs(r.requested_datetime),
        r.passenger_count,
        r.purpose,
        r.special_instructions || null,
        r.trip_category,
        r.status,
        r.rejection_reason || null,
        r.external_authorized,
        r.external_provider || null,
        r.external_status || null,
        r.coordinator_booked_uber,
        r.external_driver_name || null,
        r.external_driver_phone || null,
        r.external_vehicle_plate || null,
        r.external_vehicle_model || null,
        r.external_booking_ref || null,
        r.external_start_lat ?? null,
        r.external_start_lng ?? null,
        toTs(r.external_start_time),
        r.external_end_lat ?? null,
        r.external_end_lng ?? null,
        toTs(r.external_end_time),
        r.external_distance_km ?? null,
        r.external_cost ?? null,
        r.external_currency,
        r.external_receipt_notes || null,
        toTs(r.created_at)
      ]
    );
  }
}

async function upsertTripAssignments(client, assignments = []) {
  for (const a of assignments) {
    if (!a.request_id || !a.project_id) continue;
    await client.query(
      `INSERT INTO trip_assignments (
         id, request_id, project_id, vehicle_id, driver_id, assigned_by_user_id, status,
         rejection_reason, incident_report, estimated_pickup_time, estimated_distance_km,
         estimated_duration_mins, actual_start_time, actual_pickup_time, actual_completion_time,
         actual_distance_km, notes, staff_meter_start_lat, staff_meter_start_lng, staff_meter_started_at,
         staff_meter_end_lat, staff_meter_end_lng, staff_meter_ended_at, distance_source, created_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,COALESCE($7,'ASSIGNED'),$8,$9,$10::timestamptz,$11,$12,
         $13::timestamptz,$14::timestamptz,$15::timestamptz,$16,$17,$18,$19,$20::timestamptz,
         $21,$22,$23::timestamptz,$24,COALESCE($25::timestamptz,NOW())
       )
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status, actual_distance_km = EXCLUDED.actual_distance_km,
         actual_completion_time = EXCLUDED.actual_completion_time, updated_at = NOW()`,
      [
        a.id,
        a.request_id,
        a.project_id,
        a.vehicle_id,
        a.driver_id,
        a.assigned_by_user_id || a.assigned_by || 'usr-admin-01',
        a.status,
        a.rejection_reason || null,
        a.incident_report || null,
        toTs(a.estimated_pickup_time),
        a.estimated_distance_km ?? null,
        a.estimated_duration_mins ?? null,
        toTs(a.actual_start_time),
        toTs(a.actual_pickup_time),
        toTs(a.actual_completion_time),
        a.actual_distance_km ?? null,
        a.notes || null,
        a.staff_meter_start_lat ?? null,
        a.staff_meter_start_lng ?? null,
        toTs(a.staff_meter_started_at),
        a.staff_meter_end_lat ?? null,
        a.staff_meter_end_lng ?? null,
        toTs(a.staff_meter_ended_at),
        a.distance_source || null,
        toTs(a.created_at)
      ]
    );
  }
}

/**
 * Push full in-memory store into relational tables (FK order).
 */
function isPgPool(poolOrClient) {
  return Boolean(poolOrClient?.totalCount !== undefined && poolOrClient?.connect);
}

export async function syncStoreToRelational(poolOrClient, store) {
  if (!poolOrClient || !store) return;
  const fromPool = isPgPool(poolOrClient);
  const client = fromPool ? await poolOrClient.connect() : poolOrClient;
  const release = fromPool ? () => client.release() : () => {};

  try {
    await client.query('BEGIN');
    await upsertCountries(client, store.countries);
    await upsertProjects(client, store.projects);
    await upsertUsers(client, store.users);
    await upsertMasterPersonProjects(client, store.master_person_projects);
    await upsertProjectSites(client, store.project_sites);
    await upsertVehicles(client, store.vehicles);
    await upsertDrivers(client, store.drivers);
    await upsertMovementRequests(client, store.movement_requests);
    await upsertTripAssignments(client, store.trip_assignments);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.warn('[Store] Relational sync warning:', err.message);
  } finally {
    release();
  }
}

function userRowToStore(row) {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    full_name: row.full_name,
    phone_number: row.phone_number,
    role: row.role,
    country_id: row.country_id,
    project_id: row.project_id,
    site_id: row.site_id,
    master_active_project_id: row.master_active_project_id,
    master_active_site_id: row.master_active_site_id,
    language_preference: row.language_preference || 'en',
    avatar_url: row.avatar_url,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mergeById(array, item, idField = 'id') {
  const id = item[idField];
  const idx = array.findIndex((x) => x[idField] === id);
  if (idx === -1) {
    array.push(item);
    return;
  }
  const existing = array[idx];
  const existingTs = new Date(existing.updated_at || existing.created_at || 0).getTime();
  const incomingTs = new Date(item.updated_at || item.created_at || 0).getTime();
  if (incomingTs >= existingTs) {
    array[idx] = { ...existing, ...item };
  }
}

/**
 * After loading JSON snapshot, pull any rows from SQL that are missing or newer.
 */
export async function mergeRelationalIntoStore(pool, store) {
  if (!pool || !store) return;

  try {
    const users = await pool.query('SELECT * FROM users ORDER BY created_at');
    for (const row of users.rows) {
      const mapped = userRowToStore(row);
      const byEmail = store.users.find(
        (u) => u.email?.toLowerCase() === mapped.email?.toLowerCase()
      );
      if (!byEmail) {
        store.users.push(mapped);
      } else if (!byEmail.password_hash && mapped.password_hash) {
        Object.assign(byEmail, mapped);
      }
    }

    const reqs = await pool.query('SELECT * FROM movement_requests ORDER BY created_at');
    store.movement_requests = store.movement_requests || [];
    for (const row of reqs.rows) {
      mergeById(store.movement_requests, row);
    }

    const assigns = await pool.query('SELECT * FROM trip_assignments ORDER BY created_at');
    store.trip_assignments = store.trip_assignments || [];
    for (const row of assigns.rows) {
      mergeById(store.trip_assignments, row);
    }
  } catch (err) {
    if (err.code !== '42P01') {
      console.warn('[Store] Relational merge warning:', err.message);
    }
  }
}
