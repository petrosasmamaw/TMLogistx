import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';

/**
 * Get policies, with user acceptance status
 */
export async function getPolicies(req, res, next) {
  try {
    const store = getStore();
    const { role_target } = req.query;

    let policies = store.policies || [];
    if (role_target) {
      policies = policies.filter(p => p.role_target === role_target.toUpperCase() || p.role_target === 'ALL');
    }

    const acceptances = store.policy_acceptances || [];

    const enriched = policies.map(p => {
      const userAcceptance = acceptances.find(
        a => a.user_id === req.user.userId && a.policy_id === p.id && a.policy_version === p.version
      );

      const editor = store.users.find(u => u.id === p.updated_by_user_id);

      return {
        ...p,
        is_accepted_by_user: !!userAcceptance,
        accepted_at: userAcceptance?.accepted_at || null,
        updated_by_name: editor?.full_name || 'System Admin'
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

/**
 * Get policy specifically targeted for the authenticated user's role
 */
export async function getMyPolicy(req, res, next) {
  try {
    const store = getStore();
    const userRole = req.user.role;

    const policies = (store.policies || []).filter(
      p => (p.role_target === userRole || p.role_target === 'ALL') && p.is_active
    );

    const acceptances = store.policy_acceptances || [];

    const enriched = policies.map(p => {
      const userAcceptance = acceptances.find(
        a => a.user_id === req.user.userId && a.policy_id === p.id && a.policy_version === p.version
      );

      return {
        ...p,
        is_accepted_by_user: !!userAcceptance,
        accepted_at: userAcceptance?.accepted_at || null
      };
    });

    res.json({ success: true, role: userRole, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

/**
 * Top Admin updates policy content (bumps version)
 * Allowed for SYSTEM_ADMIN and MASTER_PERSON
 */
export async function updatePolicy(req, res, next) {
  try {
    const { id } = req.params;
    const { title, content, is_active } = req.body;

    if (!title && !content && is_active === undefined) {
      return res.status(400).json({ success: false, error: 'At least one field (title, content, is_active) is required' });
    }

    const store = getStore();
    const policy = (store.policies || []).find(p => p.id === id || p.role_target === id.toUpperCase());
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    const oldValues = { title: policy.title, content: policy.content, version: policy.version, is_active: policy.is_active };

    if (title) policy.title = title.trim();
    if (content) {
      policy.content = content.trim();
      policy.version = (policy.version || 1) + 1; // Bump version when content updates
    }
    if (is_active !== undefined) policy.is_active = Boolean(is_active);

    policy.updated_by_user_id = req.user.userId;
    policy.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'POLICY_UPDATED',
      entityType: 'POLICY',
      entityId: policy.id,
      oldValues,
      newValues: { title: policy.title, version: policy.version, is_active: policy.is_active },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: `Policy '${policy.title}' updated successfully to version ${policy.version}.`,
      data: policy
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Top Admin creates a new policy
 */
export async function createPolicy(req, res, next) {
  try {
    const { role_target, title, content } = req.body;

    if (!role_target || !title || !content) {
      return res.status(400).json({ success: false, error: 'role_target, title, and content are required' });
    }

    const validRoles = [
      'DRIVER',
      'STAFF',
      'LOGISTICS_COORDINATOR',
      'MOVEMENT_CENTER',
      'MOVEMENT_OFFICER',
      'MASTER_PERSON',
      'ALL'
    ];
    const roleKey = role_target.toUpperCase();
    if (!validRoles.includes(roleKey)) {
      return res.status(400).json({ success: false, error: `Invalid role_target. Must be one of: ${validRoles.join(', ')}` });
    }

    const store = getStore();
    const duplicate = (store.policies || []).some((p) => p.role_target === roleKey && p.is_active !== false);
    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: `A policy for ${roleKey} already exists. Use update instead.`
      });
    }
    const newPolicy = {
      id: 'pol-' + uuidv4().substring(0, 6),
      role_target: role_target.toUpperCase(),
      title: title.trim(),
      content: content.trim(),
      version: 1,
      is_active: true,
      updated_by_user_id: req.user.userId,
      updated_at: new Date(),
      created_at: new Date()
    };

    if (!store.policies) store.policies = [];
    store.policies.push(newPolicy);

    await logAudit({
      userId: req.user.userId,
      action: 'POLICY_CREATED',
      entityType: 'POLICY',
      entityId: newPolicy.id,
      newValues: { role_target: newPolicy.role_target, title: newPolicy.title },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({
      success: true,
      message: `Policy '${newPolicy.title}' created successfully.`,
      data: newPolicy
    });
  } catch (err) {
    next(err);
  }
}

/**
 * User accepts a policy agreement
 */
export async function acceptPolicy(req, res, next) {
  try {
    const policy_id = req.params.id || req.body.policy_id || req.body.policyId;
    const store = getStore();

    const policy = (store.policies || []).find(p => p.id === policy_id || p.role_target === policy_id);
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    if (!store.policy_acceptances) store.policy_acceptances = [];

    // Remove older acceptance for this policy by this user if exists
    store.policy_acceptances = store.policy_acceptances.filter(
      a => !(a.user_id === req.user.userId && a.policy_id === policy.id)
    );

    const acceptance = {
      id: 'accp-' + uuidv4().substring(0, 6),
      user_id: req.user.userId,
      policy_id: policy.id,
      policy_version: policy.version,
      accepted_at: new Date()
    };

    store.policy_acceptances.push(acceptance);

    res.json({
      success: true,
      message: `Policy agreement accepted successfully for version ${policy.version}.`,
      data: acceptance
    });
  } catch (err) {
    next(err);
  }
}
