import { useEffect, useState } from 'react';
import { geocodeProjectMapView, getInstantProjectMapView } from '../utils/projectMapFocus.js';

/**
 * Resolves fleet map center: instant known city → server/API refine.
 */
export default function useProjectMapFocus(project) {
  const [mapView, setMapView] = useState(() => getInstantProjectMapView(project));
  const [loading, setLoading] = useState(() => !getInstantProjectMapView(project));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    geocodeProjectMapView(project)
      .then((view) => {
        if (!cancelled && view) setMapView(view);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [project?.id, project?.city, project?.country?.id, project?.country?.name]);

  return { mapView, loading };
}
