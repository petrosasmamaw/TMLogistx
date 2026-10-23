import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import {
  getAuthorizedProjectIds,
  getRequesterProjectId,
  collectUserIdsForProject,
  userBelongsToProject
} from '../utils/projectScope.js';
import { MOVEMENT_CENTER, MOVEMENT_OFFICER_LEGACY } from '../constants/roles.js';
import { ensureDriverProfile } from '../utils/driverProfile.js';

export async function getUsers(req, res, next) {
  try {
    const store = getStore();
    let users = [];

    const { country_id, project_id, role, site_id } = req.query;

    if (req.user.role === 'SYSTEM_ADMIN') {
      users = store.users;
      if (country_id) users = users.filter(u => u.country_id === country_id);
      if (project_id) users = users.filter(u => u.project_id === project_id);
      if (role) users = users.filter(u => u.role === role);
      if (site_id && site_id !== 'ALL') users = users.filter(u => u.site_id === site_id);
    } else if (req.user.role === 'MASTER_PERSON') {
      const authorizedProjectIds = getAuthorizedProjectIds(req.user);
      if (project_id) {
        if (!authorizedProjectIds.includes(project_id)) {
          return res.status(403).json({
            success: false,
            error: 'Cannot list users outside your assigned projects'
          });
        }
        const ids = collectUserIdsForProject(store, project_id);
        users = store.users.filter((u) => ids.has(u.id));
      } else if (authorizedProjectIds.length) {
        const ids = new Set();
        for (const pid of authorizedProjectIds) {
          collectUserIdsForProject(store, pid).forEach((id) => ids.add(id));
        }
        users = store.users.filter((u) => ids.has(u.id));
      } else {
        users = [];
      }
      if (site_id && site_id !== 'ALL') users = users.filter((u) => u.site_id === site_id);
    } else {
      const scopeId = getRequesterProjectId(req.user, store);
      if (!scopeId) {
        users = [];
      } else {
        if (project_id && project_id !== scopeId) {
          return res.status(403).json({
            success: false,
            error: 'Cannot list users outside your assigned project'
          });
        }
        const ids = collectUserIdsForProject(store, scopeId);
        users = store.users.filter((u) => ids.has(u.id));
        if (
          req.user.role === 'LOGISTICS_COORDINATOR' ||
          req.user.role === MOVEMENT_CENTER ||
          req.user.role === MOVEMENT_OFFICER_LEGACY
        ) {
          users = users.filter((u) => ['STAFF', 'DRIVER'].includes(u.role));
        }
      }
    }

    // Sanitize passwords and enrich with project/country names
    const sanitized = users.map(u => {
      const { password_hash, ...safe } = u;
      const project = store.projects.find(p => p.id === u.project_id);
      const country = store.countries.find(c => c.id === u.country_id);
      const site = store.project_sites?.find((s) => s.id === u.site_id);
      const master_project_ids =
        u.role === 'MASTER_PERSON'
          ? (store.master_person_projects || [])
              .filter((m) => m.user_id === u.id)
              .map((m) => m.project_id)
          : undefined;

      const driverRow = u.role === 'DRIVER' ? store.drivers?.find((d) => d.user_id === u.id) : null;

      return {
        ...safe,
        project_name: project?.name || null,
        country_name: country?.name || null,
        site_name: site?.name || null,
        site_short_label: site?.short_label || null,
        ...(master_project_ids ? { master_project_ids } : {}),
        ...(driverRow
          ? {
              driver_id: driverRow.id,
              license_number: driverRow.license_number,
              shift_type: driverRow.shift_type,
              shift_start_time: driverRow.shift_start_time,
              shift_end_time: driverRow.shift_end_time
            }
          : {})
      };
    });

    res.json({ success: true, count: sanitized.length, data: sanitized });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const {
      email,
      password,
      full_name,
      phone_number,
      role,
      country_id,
      project_id,
      language_preference = 'en'
    } = req.body;

    const roleToSave =
      role === MOVEMENT_OFFICER_LEGACY || role === 'MOVEMENT_OFFICER' ? MOVEMENT_CENTER : role;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ success: false, error: 'Email, password, full_name, and role are required' });
    }

    const store = getStore();

    if (store.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(400).json({ success: false, error: 'A user with this email address already exists' });
    }

    // Role creation validation
    if (req.user.role === 'MASTER_PERSON') {
      const allowedRolesForMaster = [
        'LOGISTICS_COORDINATOR',
        MOVEMENT_CENTER,
        MOVEMENT_OFFICER_LEGACY,
        'STAFF',
        'DRIVER'
      ];
      if (!allowedRolesForMaster.includes(role) && !allowedRolesForMaster.includes(roleToSave)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Master Person cannot create users with role '${role}'. Allowed: Logistics Coordinator, Movement Center, Staff, Driver`
        });
      }

      // Must be within Master Person's authorized project scope
      const assignedIds = store.master_person_projects
        ?.filter(m => m.user_id === req.user.userId)
        .map(m => m.project_id) || [];
      const authorizedProjectIds = [...new Set([req.user.projectId, ...assignedIds].filter(Boolean))];

      if (!project_id || !authorizedProjectIds.includes(project_id)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: You cannot assign users to project '${project_id}' outside your authorized scope`
        });
      }

    } else if (req.user.role === 'LOGISTICS_COORDINATOR') {
      const allowedForFleetOps = ['STAFF', 'DRIVER'];
      if (!allowedForFleetOps.includes(roleToSave)) {
        return res.status(403).json({
          success: false,
          error: 'You can only register staff and driver mobile accounts.'
        });
      }
      const scopeId = getRequesterProjectId(req.user, store);
      const targetProject = project_id || scopeId;
      if (!targetProject || targetProject !== scopeId) {
        return res.status(403).json({
          success: false,
          error: 'You can only create workers for your assigned project'
        });
      }
    } else if (req.user.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions to create users' });
    }

    const resolvedProjectId = project_id || req.user.projectId || null;
    if (roleToSave === 'DRIVER' && !resolvedProjectId) {
      return res.status(400).json({
        success: false,
        error: 'project_id is required when creating a driver account'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = {
      id: 'usr-' + role.toLowerCase().substring(0, 5) + '-' + uuidv4().substring(0, 6),
      email: email.trim().toLowerCase(),
      password_hash,
      full_name: full_name.trim(),
      phone_number: phone_number?.trim() || null,
      role: roleToSave,
      country_id: country_id || req.user.countryId || null,
      project_id: resolvedProjectId,
      site_id: null,
      language_preference: ['en', 'am'].includes(language_preference) ? language_preference : 'en',
      avatar_url: null,
      is_active: true,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    store.users.push(newUser);

    let driverRecord = null;
    if (roleToSave === 'DRIVER') {
      driverRecord = ensureDriverProfile(store, newUser, req.body);
    }

    await logAudit({
      userId: req.user.userId,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: newUser.id,
      projectId: newUser.project_id,
      newValues: { email: newUser.email, role: newUser.role, project_id: newUser.project_id },
      ipAddress: req.ip || '127.0.0.1'
    });

    const { password_hash: _, ...safeUser } = newUser;
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...safeUser,
        ...(driverRecord
          ? {
              driver_id: driverRecord.id,
              license_number: driverRecord.license_number,
              shift_type: driverRecord.shift_type,
              shift_start_time: driverRecord.shift_start_time,
              shift_end_time: driverRecord.shift_end_time
            }
          : {})
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const {
      full_name,
      phone_number,
      is_active,
      language_preference,
      role,
      project_id,
      site_id,
      country_id,
      master_project_ids,
      password
    } = req.body;

    const store = getStore();
    const user = store.users.find(u => u.id === id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Role editing check
    if (req.user.role === 'MASTER_PERSON') {
      const authorizedProjectIds = getAuthorizedProjectIds(req.user);
      const inScope = authorizedProjectIds.some((pid) => userBelongsToProject(store, user, pid));
      if (!inScope) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Cannot modify users outside your authorized projects'
        });
      }

      if (role && ['SYSTEM_ADMIN', 'MASTER_PERSON'].includes(role)) {
        return res.status(403).json({ success: false, error: `Forbidden: Cannot set role to '${role}'` });
      }
    } else if (['LOGISTICS_COORDINATOR', MOVEMENT_CENTER, MOVEMENT_OFFICER_LEGACY].includes(req.user.role)) {
      const scopeId = getRequesterProjectId(req.user, store);
      if (!userBelongsToProject(store, user, scopeId)) {
        return res.status(403).json({ success: false, error: 'You can only edit workers in your project' });
      }
      if (!['STAFF', 'DRIVER'].includes(user.role)) {
        return res.status(403).json({ success: false, error: 'You can only edit staff and driver accounts' });
      }
    } else if (req.user.role !== 'SYSTEM_ADMIN' && req.user.userId !== id) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges' });
    }

    const oldValues = { ...user };

    if (full_name !== undefined) user.full_name = full_name.trim();
    if (phone_number !== undefined) user.phone_number = phone_number.trim();
    if (language_preference !== undefined && ['en', 'am'].includes(language_preference)) {
      user.language_preference = language_preference;
    }
    if (
      is_active !== undefined &&
      [
        'SYSTEM_ADMIN',
        'MASTER_PERSON',
        'LOGISTICS_COORDINATOR',
        MOVEMENT_CENTER,
        MOVEMENT_OFFICER_LEGACY
      ].includes(req.user.role)
    ) {
      user.is_active = Boolean(is_active);
    }
    if (role !== undefined && req.user.role === 'SYSTEM_ADMIN') {
      user.role = role;
    }
    if (role !== undefined && req.user.role === 'MASTER_PERSON') {
      const masterAssignable = [
        'LOGISTICS_COORDINATOR',
        MOVEMENT_CENTER,
        MOVEMENT_OFFICER_LEGACY,
        'STAFF',
        'DRIVER'
      ];
      const roleKey = role === MOVEMENT_OFFICER_LEGACY ? MOVEMENT_CENTER : role;
      if (masterAssignable.includes(role) || masterAssignable.includes(roleKey)) {
        user.role = roleKey === MOVEMENT_CENTER ? MOVEMENT_CENTER : role;
      }
    }
    if (project_id !== undefined && ['SYSTEM_ADMIN', 'MASTER_PERSON'].includes(req.user.role)) {
      if (req.user.role === 'MASTER_PERSON') {
        const authorized = getAuthorizedProjectIds(req.user);
        if (project_id && !authorized.includes(project_id)) {
          return res.status(403).json({ success: false, error: 'Cannot assign user to a project outside your scope' });
        }
      }
      user.project_id = project_id || null;
      if (user.role === 'DRIVER') {
        const drv = store.drivers?.find((d) => d.user_id === user.id);
        if (drv) drv.project_id = user.project_id;
      }
    }
    if (country_id !== undefined && req.user.role === 'SYSTEM_ADMIN') {
      user.country_id = country_id || null;
    }
    if (
      password !== undefined &&
      (req.user.role === 'SYSTEM_ADMIN' || req.user.role === 'MASTER_PERSON')
    ) {
      if (String(password).length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      }
      user.password_hash = await bcrypt.hash(String(password), 10);
    }
    if (master_project_ids !== undefined && req.user.role === 'SYSTEM_ADMIN' && user.role === 'MASTER_PERSON') {
      const ids = Array.isArray(master_project_ids) ? master_project_ids.filter(Boolean) : [];
      if (!store.master_person_projects) store.master_person_projects = [];
      store.master_person_projects = store.master_person_projects.filter((m) => m.user_id !== user.id);
      for (const pid of ids) {
        if (!store.projects.some((p) => p.id === pid)) continue;
        store.master_person_projects.push({
          id: 'mpp-' + uuidv4().substring(0, 6),
          user_id: user.id,
          project_id: pid
        });
      }
      if (ids.length && (!user.project_id || !ids.includes(user.project_id))) {
        user.project_id = ids[0];
      }
    }
    if (site_id !== undefined) {
      const targetProject = project_id || user.project_id;
      if (req.user.role === 'MASTER_PERSON') {
        const authorized = getAuthorizedProjectIds(req.user);
        if (!authorized.includes(user.project_id)) {
          return res.status(403).json({ success: false, error: 'Cannot modify users outside your projects' });
        }
      }
      if (
        ['LOGISTICS_COORDINATOR', 'MOVEMENT_OFFICER'].includes(req.user.role) &&
        user.project_id !== req.user.projectId
      ) {
        return res.status(403).json({ success: false, error: 'Cannot assign site for workers outside your project' });
      }
      if (site_id && targetProject && !siteBelongsToProject(site_id, targetProject)) {
        return res.status(400).json({ success: false, error: 'Site does not belong to worker project' });
      }
      user.site_id = site_id || null;
    }

    if (user.role === 'DRIVER') {
      ensureDriverProfile(store, user, {
        license_number: req.body.license_number,
        shift_type: req.body.shift_type,
        project_id: user.project_id
      });
    }

    user.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: user.id,
      projectId: user.project_id,
      oldValues,
      newValues: user,
      ipAddress: req.ip || '127.0.0.1'
    });

    const { password_hash, ...safeUser } = user;
    res.json({ success: true, message: 'User updated successfully', data: safeUser });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const store = getStore();
    const user = store.users.find(u => u.id === id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role === 'SYSTEM_ADMIN') {
      return res.status(400).json({ success: false, error: 'Cannot deactivate root System Admin account' });
    }

    user.is_active = false;
    user.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: user.id,
      projectId: user.project_id,
      newValues: { is_active: false },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: `User '${user.full_name}' deactivated successfully` });
  } catch (err) {
    next(err);
  }
}
