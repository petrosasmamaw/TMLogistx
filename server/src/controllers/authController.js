import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { getAuthorizedProjectIds, siteBelongsToProject } from '../utils/projectScope.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const store = getStore();
    const user = store.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Account has been deactivated. Please contact your System Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Determine authorized projects for Master Persons
    let authorizedProjectIds = user.project_id ? [user.project_id] : [];
    if (user.role === 'MASTER_PERSON') {
      const additional = store.master_person_projects
        ?.filter(m => m.user_id === user.id)
        .map(m => m.project_id) || [];
      authorizedProjectIds = [...new Set([...authorizedProjectIds, ...additional])];
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      countryId: user.country_id,
      projectId: user.project_id,
      authorizedProjectIds,
      languagePreference: user.language_preference || 'en'
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    // Update last login
    user.last_login_at = new Date();

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      projectId: user.project_id,
      newValues: { email: user.email, role: user.role },
      ipAddress: req.ip || '127.0.0.1'
    });

    const { password_hash, ...safeUser } = user;

    if (user.role === 'DRIVER') {
      const drv = store.drivers.find((d) => d.user_id === user.id);
      if (drv) {
        safeUser.driver_id = drv.id;
        safeUser.assigned_vehicle_id = drv.assigned_vehicle_id;
        const veh = drv.assigned_vehicle_id
          ? store.vehicles.find((v) => v.id === drv.assigned_vehicle_id)
          : null;
        if (veh) {
          safeUser.vehicle_plate = veh.plate_number;
          safeUser.vehicle_model = `${veh.make} ${veh.model}`;
        }
      }
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        ...safeUser,
        authorizedProjectIds
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const store = getStore();
    const user = store.users.find(u => u.id === req.user.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    // Attach country and project metadata
    const country = user.country_id ? store.countries.find(c => c.id === user.country_id) : null;
    const project = user.project_id ? store.projects.find(p => p.id === user.project_id) : null;

    let authorizedProjects = [];
    if (user.role === 'MASTER_PERSON') {
      const { listMasterAuthorizedProjects } = await import('../utils/ensureProject.js');
      authorizedProjects = listMasterAuthorizedProjects(store, {
        role: user.role,
        userId: user.id,
        projectId: user.project_id,
        countryId: user.country_id
      });
    } else if (user.role === 'SYSTEM_ADMIN') {
      authorizedProjects = store.projects.map((p) => {
        const sites = (store.project_sites || []).filter((s) => s.project_id === p.id);
        return { ...p, sites };
      });
    } else if (project) {
      const sites = (store.project_sites || []).filter((s) => s.project_id === project.id);
      authorizedProjects = [{ ...project, sites }];
    }

    const activeProjectId = user.master_active_project_id || user.project_id || authorizedProjects[0]?.id || null;
    const activeSiteId = user.master_active_site_id || user.site_id || authorizedProjects[0]?.sites?.[0]?.id || null;

    const { password_hash, ...safeUser } = user;

    if (user.role === 'DRIVER') {
      const drv = store.drivers.find((d) => d.user_id === user.id);
      if (drv) {
        safeUser.driver_id = drv.id;
        safeUser.assigned_vehicle_id = drv.assigned_vehicle_id;
        const veh = drv.assigned_vehicle_id
          ? store.vehicles.find((v) => v.id === drv.assigned_vehicle_id)
          : null;
        if (veh) {
          safeUser.vehicle_plate = veh.plate_number;
          safeUser.vehicle_model = `${veh.make} ${veh.model}`;
        }
      }
    }

    res.json({
      success: true,
      user: {
        ...safeUser,
        country,
        project,
        authorizedProjects,
        masterScope: user.role === 'MASTER_PERSON'
          ? { activeProjectId, activeSiteId }
          : null
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMasterScope(req, res, next) {
  try {
    if (req.user.role !== 'MASTER_PERSON') {
      return res.status(403).json({ success: false, error: 'Only Master Person accounts can update project scope' });
    }

    const { active_project_id, active_site_id } = req.body;
    const store = getStore();
    const user = store.users.find((u) => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const authorized = getAuthorizedProjectIds(req.user);
    if (active_project_id && !authorized.includes(active_project_id)) {
      return res.status(403).json({ success: false, error: 'Project not in your assigned scope' });
    }
    if (active_site_id && active_project_id && !siteBelongsToProject(active_site_id, active_project_id)) {
      return res.status(400).json({ success: false, error: 'Site does not belong to selected project' });
    }

    if (active_project_id) user.master_active_project_id = active_project_id;
    if (active_site_id) user.master_active_site_id = active_site_id;
    user.updated_at = new Date();

    res.json({
      success: true,
      masterScope: {
        activeProjectId: user.master_active_project_id,
        activeSiteId: user.master_active_site_id
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    const store = getStore();
    const user = store.users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    user.updated_at = new Date();

    await logAudit({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: user.id,
      projectId: user.project_id,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}
