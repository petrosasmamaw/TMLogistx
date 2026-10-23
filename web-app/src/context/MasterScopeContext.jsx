import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiRequest } from '../api/client.js';

const MasterScopeContext = createContext(null);

const STORAGE_KEY = 'tmlogistx_master_scope';

export function MasterScopeProvider({ children }) {
  const { user } = useSelector((state) => state.auth);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState(null);

  const loadScope = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/me');
      const me = res.user || {};
      let list = me.authorizedProjects || [];
      if (list.length === 0) {
        const pRes = await apiRequest('/projects');
        list = pRes.data || [];
      }
      setProjects(list);

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const scope = me.masterScope || {};
      const preferredId =
        saved.activeProjectId ||
        scope.activeProjectId ||
        me.project_id ||
        list[0]?.id ||
        null;

      const project =
        list.find((p) => p.id === preferredId && p.is_active !== false) ||
        list.find((p) => p.is_active !== false) ||
        list[0];
      const projectId = project?.id || null;
      setActiveProjectId(projectId);
      if (projectId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeProjectId: projectId }));
      }
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'MASTER_PERSON') {
      loadScope();
    }
  }, [user, loadScope]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const persistScope = async (projectId) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeProjectId: projectId }));
    if (projectId) {
      try {
        await apiRequest('/auth/master-scope', {
          method: 'PATCH',
          body: { active_project_id: projectId, active_site_id: null }
        });
      } catch {
        /* non-blocking */
      }
    }
  };

  const setProject = async (projectId) => {
    setActiveProjectId(projectId);
    await persistScope(projectId);
  };

  const scopeQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (activeProjectId) q.set('project_id', activeProjectId);
    return q.toString();
  }, [activeProjectId]);

  const value = {
    loading,
    projects,
    activeProject,
    activeProjectId,
    setProject,
    scopeQuery,
    reload: loadScope
  };

  return <MasterScopeContext.Provider value={value}>{children}</MasterScopeContext.Provider>;
}

export function useMasterScope() {
  const ctx = useContext(MasterScopeContext);
  if (!ctx) {
    throw new Error('useMasterScope must be used within MasterScopeProvider');
  }
  return ctx;
}
