import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const TERMINAL = new Set(['COMPLETED', 'CANCELLED', 'REJECTED']);

/**
 * Staff active ride — always the latest row from Redux (socket merges update requests[]).
 */
export default function useStaffActiveTrip() {
  const activeTripFromStore = useSelector((state) => state.trips.activeTrip);
  const staffRequests = useSelector((state) => state.trips.requests);

  return useMemo(() => {
    const id = activeTripFromStore?.id;
    if (id) {
      const live = staffRequests.find((r) => r.id === id);
      if (live) return live;
      if (activeTripFromStore) return activeTripFromStore;
    }
    return staffRequests.find((r) => r?.status && !TERMINAL.has(r.status)) || null;
  }, [activeTripFromStore, staffRequests]);
}
