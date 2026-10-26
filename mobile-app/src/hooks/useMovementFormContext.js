import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';

export default function useMovementFormContext(projectId) {
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.getRequestFormContext(projectId);
      const body = res?.movement_shift_band != null ? res : res?.data || res;
      setCtx(body);
    } catch {
      setCtx(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  const isDayShift = ctx?.movement_shift_band === 'DAY';
  const showPurpose =
    (Array.isArray(ctx?.form_fields) && ctx.form_fields.includes('purpose')) ||
    isDayShift ||
    /day/i.test(String(ctx?.movement_shift_label || ''));
  const showDropoffWait =
    (Array.isArray(ctx?.form_fields) && ctx.form_fields.includes('dropoff_or_wait')) || !ctx;

  return { ctx, loading, refresh, isDayShift, showPurpose, showDropoffWait };
}
