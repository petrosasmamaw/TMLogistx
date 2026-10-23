import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { cascadeCloseProject } from '../utils/cascadeClose.js';

export async function getProjects(req, res, next) {
  try {
    const store = getStore();
    let projects = [];

    if (req.user.role === 'SYSTEM_ADMIN') {
      projects = store.projects;
    } else if (req.user.role === 'MASTER_PERSON') {
      const { listMasterAuthorizedProjects } = await import('../utils/ensureProject.js');
      const authorizedRows = listMasterAuthorizedProjects(store, req.user);
      projects = authorizedRows.map((row) => {
        const { sites, country, vehicleCount, driverCount, masterPersons, ...proj } = row;
        return proj;
      });
    } else {
      projects = store.projects.filter(p => p.id === req.user.projectId);
    }

    // Enrich with country details, vehicle count, driver count, and assigned Master Person
    const enriched = projects.map(proj => {
      const country = store.countries.find(c => c.id === proj.country_id);
      const vehicleCount = store.vehicles.filter(v => v.project_id === proj.id).length;
      const driverCount = store.drivers.filter(d => d.project_id === proj.id).length;
      
      // Find Master Persons assigned to this project
      const masterAssignments = store.master_person_projects
        ?.filter(m => m.project_id === proj.id)
        .map(m => m.user_id) || [];
      
      const masterPersons = store.users.filter(u => 
        (u.project_id === proj.id && u.role === 'MASTER_PERSON') || 
        masterAssignments.includes(u.id)
      ).map(u => ({ id: u.id, full_name: u.full_name, email: u.email }));

      const sites = (store.project_sites || [])
        .filter((s) => s.project_id === proj.id && s.is_active !== false)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      return {
        ...proj,
        country: country ? { id: country.id, name: country.name, code: country.code } : null,
        vehicleCount,
        driverCount,
        masterPersons,
        sites
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const {
      country_id,
      name,
      code,
      city = '',
      description = '',
      allow_vehicle_sharing = false,
      master_person_id = null
    } = req.body;

    if (!country_id || !name || !code || !String(city).trim()) {
      return res.status(400).json({
        success: false,
        error: 'country_id, project name, code, and city are required'
      });
    }

    const store = getStore();
    const country = store.countries.find(c => c.id === country_id);
    if (!country) {
      return res.status(404).json({ success: false, error: 'Target country not found' });
    }

    if (store.projects.some(p => p.country_id === country_id && p.code.toUpperCase() === code.toUpperCase())) {
      return res.status(400).json({ success: false, error: `Project code '${code}' already exists under this country` });
    }

    const newProject = {
      id: 'proj-' + code.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + uuidv4().substring(0, 4),
      country_id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      city: String(city).trim(),
      description: description.trim(),
      allow_vehicle_sharing: Boolean(allow_vehicle_sharing),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    store.projects.push(newProject);

    // If master_person_id is supplied, assign them
    if (master_person_id) {
      const masterUser = store.users.find(u => u.id === master_person_id && u.role === 'MASTER_PERSON');
      if (masterUser) {
        if (!store.master_person_projects) store.master_person_projects = [];
        store.master_person_projects.push({
          id: 'mpp-' + uuidv4().substring(0, 6),
          user_id: masterUser.id,
          project_id: newProject.id
        });
        if (!masterUser.project_id) {
          masterUser.project_id = newProject.id;
        }
      }
    }

    await logAudit({
      userId: req.user.userId,
      action: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: newProject.id,
      projectId: newProject.id,
      newValues: newProject,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({ success: true, message: 'Project created successfully', data: newProject });
  } catch (err) {
    next(err);
  }
}

function findProjectById(store, rawId) {
  if (!rawId) return null;
  const id = decodeURIComponent(String(rawId).trim());
  return store.projects.find((p) => p.id === id) || null;
}

export async function updateProject(req, res, next) {
  try {
    const { id: paramId } = req.params;
    const { name, description, allow_vehicle_sharing, is_active, country_id, city, master_person_id } =
      req.body;

    const store = getStore();
    const project = findProjectById(store, paramId);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const oldValues = { ...project };

    if (name !== undefined) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (country_id !== undefined) {
      const country = store.countries.find((c) => c.id === country_id);
      if (!country) {
        return res.status(404).json({ success: false, error: 'Target country not found' });
      }
      project.country_id = country_id;
    }
    if (city !== undefined) project.city = String(city).trim();
    if (allow_vehicle_sharing !== undefined) project.allow_vehicle_sharing = Boolean(allow_vehicle_sharing);
    if (master_person_id !== undefined) {
      if (!store.master_person_projects) store.master_person_projects = [];
      store.master_person_projects = store.master_person_projects.filter(
        (m) => m.project_id !== project.id
      );
      if (master_person_id) {
        const master = store.users.find(
          (u) => u.id === master_person_id && u.role === 'MASTER_PERSON'
        );
        if (!master) {
          return res.status(400).json({ success: false, error: 'master_person_id must be a MASTER_PERSON user' });
        }
        store.master_person_projects.push({
          id: 'mpp-' + uuidv4().substring(0, 6),
          user_id: master_person_id,
          project_id: project.id
        });
        if (!master.project_id) {
          master.project_id = project.id;
        }
      }
    }
    if (is_active !== undefined) {
      const closing = is_active === false || is_active === 'false';
      const reopening = is_active === true || is_active === 'true';
      if (closing) {
        cascadeCloseProject(store, project.id);
      } else if (reopening) {
        project.is_active = true;
        project.closed_at = null;
      }
    }
    project.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'PROJECT_UPDATED',
      entityType: 'PROJECT',
      entityId: project.id,
      projectId: project.id,
      oldValues,
      newValues: project,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'Project updated successfully', data: project });
  } catch (err) {
    next(err);
  }
}

export async function assignMasterPerson(req, res, next) {
  try {
    const { id: projectId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const store = getStore();
    const project = store.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const user = store.users.find(u => u.id === user_id);
    if (!user || user.role !== 'MASTER_PERSON') {
      return res.status(400).json({ success: false, error: 'Target user must have the MASTER_PERSON role' });
    }

    if (!store.master_person_projects) store.master_person_projects = [];
    const alreadyAssigned = store.master_person_projects.some(
      m => m.user_id === user_id && m.project_id === projectId
    );

    if (!alreadyAssigned) {
      store.master_person_projects.push({
        id: 'mpp-' + uuidv4().substring(0, 6),
        user_id,
        project_id: projectId
      });
    }

    // Set primary project if not set
    if (!user.project_id) {
      user.project_id = projectId;
    }

    await logAudit({
      userId: req.user.userId,
      action: 'MASTER_PERSON_ASSIGNED',
      entityType: 'PROJECT',
      entityId: projectId,
      projectId,
      newValues: { user_id, user_email: user.email },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: `Master Person '${user.full_name}' assigned to project '${project.name}'` });
  } catch (err) {
    next(err);
  }
}
