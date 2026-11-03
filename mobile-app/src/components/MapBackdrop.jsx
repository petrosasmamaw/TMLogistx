import React from 'react';
import { useSelector } from 'react-redux';
import TripLiveMap from './TripLiveMap';

/** Dim map layer for tall-sheet tabs (History, Profile, etc.). */
export default function MapBackdrop({ mode = 'staff' }) {
  const gps = useSelector((state) => state.gps.currentLocation);
  return (
    <TripLiveMap
      mode={mode}
      fullBleed
      showChrome={false}
      alwaysShow
      staffLat={mode === 'staff' ? gps?.latitude : null}
      staffLng={mode === 'staff' ? gps?.longitude : null}
      driverLat={mode === 'driver' ? gps?.latitude : null}
      driverLng={mode === 'driver' ? gps?.longitude : null}
      tripStatus="PENDING"
    />
  );
}
