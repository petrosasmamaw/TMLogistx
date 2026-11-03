import { useEffect, useRef, useState } from 'react';
import { loadMapRuntimeConfig } from '../utils/mapRuntime.js';
import { mapboxDrivingRoute } from '../utils/mapbox.js';

function coordKey(lat, lng) {
  if (lat == null || lng == null) return '';
  return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
}

/** Road-following routes only (no straight-line fallback on web dispatch map). */
export default function useMapboxDrivingRoutes({
  pickupLat,
  pickupLng,
  destLat,
  destLng,
  driverLat,
  driverLng,
  liveTargetLat,
  liveTargetLng,
  liveNavEnabled = true,
}) {
  const [planRouteCoords, setPlanRouteCoords] = useState([]);
  const [liveRouteCoords, setLiveRouteCoords] = useState([]);
  const [routeMeta, setRouteMeta] = useState({ planKm: null, liveKm: null, liveMins: null });
  const [planLoading, setPlanLoading] = useState(false);
  const liveDebounceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPlanLoading(true);
      setPlanRouteCoords([]);
      setRouteMeta((m) => ({ ...m, planKm: null }));

      if (pickupLat != null && pickupLng != null && destLat != null && destLng != null) {
        await loadMapRuntimeConfig();
        const planRes = await mapboxDrivingRoute(pickupLat, pickupLng, destLat, destLng);
        if (!cancelled && planRes?.coordinates?.length >= 2) {
          setPlanRouteCoords(planRes.coordinates);
          setRouteMeta((m) => ({ ...m, planKm: planRes.distanceKm }));
        }
      }

      if (!cancelled) setPlanLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [coordKey(pickupLat, pickupLng), coordKey(destLat, destLng)]);

  useEffect(() => {
    if (!liveNavEnabled) {
      setLiveRouteCoords([]);
      setRouteMeta((m) => ({ ...m, liveKm: null, liveMins: null }));
      return undefined;
    }

    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);

    liveDebounceRef.current = setTimeout(async () => {
      setLiveRouteCoords([]);
      setRouteMeta((m) => ({ ...m, liveKm: null, liveMins: null }));

      if (
        driverLat != null &&
        driverLng != null &&
        liveTargetLat != null &&
        liveTargetLng != null
      ) {
        await loadMapRuntimeConfig();
        const liveRes = await mapboxDrivingRoute(driverLat, driverLng, liveTargetLat, liveTargetLng);
        if (liveRes?.coordinates?.length >= 2) {
          setLiveRouteCoords(liveRes.coordinates);
          setRouteMeta((m) => ({
            ...m,
            liveKm: liveRes.distanceKm,
            liveMins: liveRes.timeMins,
          }));
        }
      }
    }, 600);

    return () => {
      if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    };
  }, [
    liveNavEnabled,
    coordKey(driverLat, driverLng),
    coordKey(liveTargetLat, liveTargetLng),
  ]);

  return { planRouteCoords, liveRouteCoords, routeMeta, routesLoading: planLoading };
}
