import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../api/client.js';

export default function CountrySearchSelect({ value, onSelect }) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiRequest(`/countries/catalog?q=${encodeURIComponent(query)}&limit=40`);
        setResults(res.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const pick = (row) => {
    onSelect(row);
    setQuery(row.name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="text-slate-700 block mb-1 font-medium text-xs">Country (search all countries)</label>
      <input
        type="text"
        required
        placeholder="Type to search… e.g. Ethiopia"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900"
      />
      {value?.code && (
        <p className="text-[10px] text-slate-500 mt-1">
          Selected: {value.name} ({value.code}) · {value.timezone} · {value.currency}
        </p>
      )}
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <p className="p-3 text-xs text-slate-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs text-slate-500">No matches. Keep typing.</p>
          ) : (
            results.map((row) => (
              <button
                key={row.code}
                type="button"
                onClick={() => pick(row)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 border-b border-slate-50 last:border-0"
              >
                <span className="font-semibold text-slate-800">{row.name}</span>
                <span className="text-slate-500"> · {row.code} · {row.currency}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
