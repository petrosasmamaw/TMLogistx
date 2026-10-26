import { useEffect, useState } from 'react';
import { geocodeProjectMapView } from '../utils/projectMapFocus.js';

/**
 * Geocodes the active project's city (or country) for fleet map initial view.
 */
export default function useProjectMapFocus(project) {
  const [mapView, setMapView] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    geocodeProjectMapView(project).then((view) => {
      if (!cancelled) setMapView(view);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [project?.id, project?.city, project?.country?.id, project?.country?.name]);

  return { mapView, loading };
}
