import React from 'react';
import { Globe } from 'lucide-react';
import { useMasterScope } from '../../context/MasterScopeContext.jsx';

export default function MasterScopeBar() {
  const { projects, activeProject, activeProjectId, setProject } = useMasterScope();

  return (
    <div className="space-y-2">
      {projects.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" /> Project
          </span>
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProject(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                activeProjectId === p.id
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-200'
              }`}
            >
              {p.name}
              {p.city ? ` · ${p.city}` : ''}
            </button>
          ))}
        </div>
      )}
      {activeProject && (
        <p className="text-[11px] text-slate-500">
          Operating city: <span className="font-semibold text-slate-700">{activeProject.city || 'Not set'}</span>
        </p>
      )}
    </div>
  );
}
