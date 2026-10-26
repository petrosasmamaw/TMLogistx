import { useEffect, useRef, useState } from 'react';
import { mapboxDrivingRoute } from '../utils/mapbox';

function coordKey(lat, lng) {
  if (lat == null || lng == null) return '';
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Fetches Mapbox driving geometry (fastest car path) for trip + live leg.
 * Plan route loads once per pickup/dest; live leg updates without full-screen loading flash.
 */
export default function useMapboxDrivingRoutes({
  pickupLat,
  pickupLng,
  destLat,
  destLng,
  driverLat,
  driverLng,
  liveTargetLat,
  liveTargetLng,
  liveNavEnabled = true
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
      let plan = [];
      let planKm = null;

      if (pickupLat != null && pickupLng != null && destLat != null && destLng != null) {
        const planRes = await mapboxDrivingRoute(pickupLat, pickupLng, destLat, destLng);
        if (!cancelled && planRes?.coordinates?.length) {
          plan = planRes.coordinates;
          planKm = planRes.distanceKm;
        }
      }

      if (!plan.length && pickupLat != null && destLat != null) {
        plan = [[pickupLat, pickupLng], [destLat, destLng]];
      }

      if (!cancelled) {
        setPlanRouteCoords(plan);
        setRouteMeta((m) => ({ ...m, planKm }));
        setPlanLoading(false);
      }
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
      let live = [];
      let liveKm = null;
      let liveMins = null;

      if (
        driverLat != null &&
        driverLng != null &&
        liveTargetLat != null &&
        liveTargetLng != null
      ) {
        const liveRes = await mapboxDrivingRoute(
          driverLat,
          driverLng,
          liveTargetLat,
          liveTargetLng
        );
        if (liveRes?.coordinates?.length) {
          live = liveRes.coordinates;
          liveKm = liveRes.distanceKm;
          liveMins = liveRes.timeMins;
        }
      }

      if (!live.length && driverLat != null && liveTargetLat != null) {
        live = [[driverLat, driverLng], [liveTargetLat, liveTargetLng]];
      }

      setLiveRouteCoords(live);
      setRouteMeta((m) => ({ ...m, liveKm, liveMins }));
    }, 600);

    return () => {
      if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
    };
  }, [
    liveNavEnabled,
    coordKey(driverLat, driverLng),
    coordKey(liveTargetLat, liveTargetLng)
  ]);

  return { planRouteCoords, liveRouteCoords, routeMeta, routesLoading: planLoading };
}
