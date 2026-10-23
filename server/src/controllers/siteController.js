import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { getAuthorizedProjectIds, isProjectAuthorized, siteBelongsToProject } from '../utils/projectScope.js';
import { ensureProjectInStore } from '../utils/ensureProject.js';
import { cascadeCloseSite } from '../utils/cascadeClose.js';

const SITE_MUTATION_ROLES = ['SYSTEM_ADMIN', 'MASTER_PERSON'];

function resolveProjectId(req) {
  return req.params.projectId || req.params.id;
}

function enrichSite(store, site) {
  const coord = site.lead_logistics_coordinator_user_id
    ? store.users.find((u) => u.id === site.lead_logistics_coordinator_user_id)
    : null;
  const move = site.lead_movement_officer_user_id
    ? store.users.find((u) => u.id === site.lead_movement_officer_user_id)
    : null;
  return {
    ...site,
    lead_logistics_coordinator: coord
      ? { id: coord.id, full_name: coord.full_name, email: coord.email }
      : null,
    lead_movement_officer: move ? { id: move.id, full_name: move.full_name, email: move.email } : null
  };
}

export async function getProjectSites(req, res, next) {
  try {
    const projectId = resolveProjectId(req);
    const store = getStore();

    if (!isProjectAuthorized(req.user, projectId)) {
      return res.status(403).json({ success: false, error: 'Forbidden: project not in your scope' });
    }

    const includeClosed = req.query.include_closed === 'true';
    const sites = (store.project_sites || [])
      .filter((s) => s.project_id === projectId && (includeClosed || s.is_active !== false))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    res.json({
      success: true,
      count: sites.length,
      data: sites.map((s) => enrichSite(store, s))
    });
  } catch (err) {
    next(err);
  }
}

export async function createProjectSite(req, res, next) {
  try {
    const projectId = resolveProjectId(req);
    const { name, short_label } = req.body;
    const store = getStore();

    if (!SITE_MUTATION_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (!isProjectAuthorized(req.user, projectId)) {
      return res.status(403).json({ success: false, error: 'Forbidden: project not in your scope' });
    }
    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: 'Site name is required' });
    }

    const project = ensureProjectInStore(store, projectId, req.user);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or not assigned to your master account'
      });
    }
    if (project.is_active === false) {
      return res.status(400).json({ success: false, error: 'Cannot add sites to a closed project' });
    }

    const existing = store.project_sites || [];
    const maxOrder = existing
      .filter((s) => s.project_id === projectId)
      .reduce((m, s) => Math.max(m, s.display_order || 0), 0);

    const site = {
      id: `site-${uuidv4().substring(0, 8)}`,
      project_id: projectId,
      country_id: project.country_id,
      name: name.trim(),
      short_label: (short_label || name).trim().substring(0, 24),
      display_order: maxOrder + 1,
      lead_logistics_coordinator_user_id: null,
      lead_movement_officer_user_id: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    if (!store.project_sites) store.project_sites = [];
    store.project_sites.push(site);

    await logAudit({
      userId: req.user.userId,
      action: 'PROJECT_SITE_CREATED',
      entityType: 'PROJECT_SITE',
      entityId: site.id,
      projectId,
      newValues: site,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({ success: true, data: enrichSite(store, site) });
  } catch (err) {
    next(err);
  }
}

export async function assignSiteLeads(req, res, next) {
  try {
    const { id } = req.params;
    const { logistics_coordinator_user_id, movement_officer_user_id, set_as_site_lead } = req.body;
    const store = getStore();
    const site = store.project_sites?.find((s) => s.id === id);

    if (!site) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }
    if (!SITE_MUTATION_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (!isProjectAuthorized(req.user, site.project_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const validateLead = (userId, expectedRole) => {
      if (!userId) return null;
      const u = store.users.find((usr) => usr.id === userId);
      if (!u) throw Object.assign(new Error('User not found'), { status: 404 });
      if (u.project_id !== site.project_id) {
        throw Object.assign(new Error('User must belong to the same project as the site'), { status: 400 });
      }
      if (u.role !== expectedRole) {
        throw Object.assign(new Error(`User must have role ${expectedRole}`), { status: 400 });
      }
      if (set_as_site_lead && u.site_id !== site.id) {
        u.site_id = site.id;
        u.updated_at = new Date();
      }
      return userId;
    };

    const clearLeadFromOtherSites = (userId, field) => {
      if (!userId) return;
      (store.project_sites || [])
        .filter((s) => s.project_id === site.project_id && s.id !== site.id)
        .forEach((s) => {
          if (s[field] === userId) s[field] = null;
        });
    };

    try {
      if (logistics_coordinator_user_id !== undefined) {
        const id = logistics_coordinator_user_id
          ? validateLead(logistics_coordinator_user_id, 'LOGISTICS_COORDINATOR')
          : null;
        if (id) {
          clearLeadFromOtherSites(id, 'lead_logistics_coordinator_user_id');
          const u = store.users.find((usr) => usr.id === id);
          if (u) u.site_id = site.id;
        }
        site.lead_logistics_coordinator_user_id = id;
      }
      if (movement_officer_user_id !== undefined) {
        const id = movement_officer_user_id
          ? validateLead(movement_officer_user_id, 'MOVEMENT_OFFICER')
          : null;
        if (id) {
          clearLeadFromOtherSites(id, 'lead_movement_officer_user_id');
          const u = store.users.find((usr) => usr.id === id);
          if (u) u.site_id = site.id;
        }
        site.lead_movement_officer_user_id = id;
      }
    } catch (e) {
      return res.status(e.status || 400).json({ success: false, error: e.message });
    }

    site.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'PROJECT_SITE_LEADS_ASSIGNED',
      entityType: 'PROJECT_SITE',
      entityId: site.id,
      projectId: site.project_id,
      newValues: {
        lead_logistics_coordinator_user_id: site.lead_logistics_coordinator_user_id,
        lead_movement_officer_user_id: site.lead_movement_officer_user_id
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, data: enrichSite(store, site) });
  } catch (err) {
    next(err);
  }
}

export async function updateProjectSite(req, res, next) {
  try {
    const { id } = req.params;
    const { name, short_label, display_order, is_active } = req.body;
    const store = getStore();
    const site = store.project_sites?.find((s) => s.id === id);

    if (!site) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    if (!isProjectAuthorized(req.user, site.project_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden: cannot edit sites outside your projects' });
    }

    if (!SITE_MUTATION_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const oldValues = { ...site };
    if (name !== undefined) site.name = name.trim();
    if (short_label !== undefined) site.short_label = short_label.trim();
    if (display_order !== undefined) site.display_order = parseInt(display_order, 10) || 0;
    if (is_active !== undefined) {
      const closing = is_active === false;
      if (closing && SITE_MUTATION_ROLES.includes(req.user.role)) {
        cascadeCloseSite(store, site.id);
      } else if (!closing) {
        site.is_active = true;
        site.closed_at = null;
      }
    }
    site.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'PROJECT_SITE_UPDATED',
      entityType: 'PROJECT_SITE',
      entityId: site.id,
      projectId: site.project_id,
      oldValues,
      newValues: site,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, data: enrichSite(store, site) });
  } catch (err) {
    next(err);
  }
}

export async function listAccessibleSites(req, res, next) {
  try {
    const store = getStore();
    const projectIds = getAuthorizedProjectIds(req.user);
    const sites = (store.project_sites || [])
      .filter((s) => projectIds.includes(s.project_id) && s.is_active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    res.json({
      success: true,
      count: sites.length,
      data: sites.map((s) => enrichSite(store, s))
    });
  } catch (err) {
    next(err);
  }
}
