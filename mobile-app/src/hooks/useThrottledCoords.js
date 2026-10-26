import { useEffect, useRef, useState } from 'react';

/**
 * Throttle map/route updates so the map does not churn on every GPS tick.
 * Emits at most once per `delayMs`, always delivering the latest position (trailing update).
 */
export default function useThrottledCoords(lat, lng, delayMs = 2500) {
  const [coords, setCoords] = useState({ lat, lng });
  const lastEmitRef = useRef(0);
  const timerRef = useRef(null);
  const latestRef = useRef({ lat, lng });
  latestRef.current = { lat, lng };

  useEffect(() => {
    if (lat == null || lng == null) return undefined;
    const emit = () => {
      lastEmitRef.current = Date.now();
      timerRef.current = null;
      setCoords(latestRef.current);
    };
    const elapsed = Date.now() - lastEmitRef.current;
    if (elapsed >= delayMs) {
      emit();
    } else if (!timerRef.current) {
      timerRef.current = setTimeout(emit, delayMs - elapsed);
    }
    return undefined;
  }, [lat, lng, delayMs]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return coords;
}
