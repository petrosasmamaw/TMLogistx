import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { getStore, queueStoreSave } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { getAuthorizedProjectIds, siteBelongsToProject } from '../utils/projectScope.js';
import { assertUniqueUserContact, findUserByEmail } from '../utils/userUniqueness.js';
import { isValidPhone } from '../utils/normalizePhone.js';
import { sendPasswordResetEmail } from '../utils/brevoMail.js';
import { uploadProfileImage } from '../utils/cloudinaryUpload.js';

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

    queueStoreSave();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const store = getStore();
    const user = findUserByEmail(store, email);
    if (user?.is_active && user.role !== 'SYSTEM_ADMIN') {
      const token = crypto.randomBytes(32).toString('hex');
      user.password_reset_token = token;
      user.password_reset_expires_at = new Date(Date.now() + 60 * 60 * 1000);
      user.updated_at = new Date();
      queueStoreSave();

      const resetUrl = `${config.webAppUrl}/?reset_token=${token}`;
      try {
        await sendPasswordResetEmail(user, resetUrl);
      } catch (mailErr) {
        console.error('[forgotPassword] email failed:', mailErr.message);
      }
    }

    res.json({
      success: true,
      message: 'If an account exists for that email, a reset link has been sent.'
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Valid reset token and new password (min 8 characters) are required'
      });
    }

    const store = getStore();
    const user = store.users.find(
      (u) => u.password_reset_token === token && u.password_reset_expires_at
    );
    if (!user || new Date(user.password_reset_expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset link' });
    }
    if (user.role === 'SYSTEM_ADMIN') {
      return res.status(400).json({ success: false, error: 'This account cannot be reset by email. Use Change PIN after sign-in.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    user.password_reset_token = null;
    user.password_reset_expires_at = null;
    user.updated_at = new Date();
    queueStoreSave();

    await logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: user.id,
      projectId: user.project_id,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'Password updated. You can sign in now.' });
  } catch (err) {
    next(err);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const store = getStore();
    const user = store.users.find((u) => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { phone_number, full_name, avatar_image } = req.body;

    if (full_name !== undefined) user.full_name = String(full_name).trim();

    if (phone_number !== undefined) {
      if (!isValidPhone(phone_number)) {
        return res.status(400).json({ success: false, error: 'Invalid phone number' });
      }
      assertUniqueUserContact(store, {
        phone_number,
        excludeUserId: user.id
      });
      user.phone_number = String(phone_number).trim();
    }

    if (avatar_image) {
      const url = await uploadProfileImage(avatar_image);
      if (url) user.avatar_url = url;
    }

    user.updated_at = new Date();
    queueStoreSave();

    const { password_hash, password_reset_token, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}
