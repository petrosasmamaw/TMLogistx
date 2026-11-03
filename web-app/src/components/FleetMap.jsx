import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, MapPin, Search } from 'lucide-react';
import {
  getMapboxAccessToken,
  getMapboxLeafletTileConfig,
  mapboxDrivingRoute,
  mapboxForwardGeocode
} from '../utils/mapbox.js';
import {
  CITY_MAP_ZOOM,
  FALLBACK_MAP_CENTER,
  FALLBACK_MAP_LABEL
} from '../utils/projectMapFocus.js';
import {
  shouldShowMovementCenterDestPin,
  shouldShowMovementCenterPickupPin,
} from '../utils/tripLocationRules.js';
import { getOsmLeafletTileOptions } from '../utils/mapTiles.js';

const MAPBOX_TOKEN = getMapboxAccessToken();

function isValidLatLng(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
}

function normalizeCenter(center, fallback = FALLBACK_MAP_CENTER) {
  if (!center || center.length < 2) return fallback;
  return isValidLatLng(center[0], center[1]) ? [Number(center[0]), Number(center[1])] : fallback;
}

function clampMapZoom(z) {
  const n = Number(z);
  if (!Number.isFinite(n)) return CITY_MAP_ZOOM;
  return Math.min(18, Math.max(2, Math.round(n)));
}

const DEFAULT_CENTER = FALLBACK_MAP_CENTER;
const DEFAULT_CITY_LABEL = FALLBACK_MAP_LABEL;
const CITY_ZOOM = CITY_MAP_ZOOM;

function distanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null)) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

// Custom map marker assets (same sizing as driver car: 28px)
const CAR_MARKER_URL = '/car.png';
const STAFF_MARKER_URL = '/staff-marker.png';
const DEST_MARKER_URL = '/destination-marker.png';
const TRIP_MARKER_SHADOW = 'drop-shadow(0 2px 5px rgba(15,31,25,.35))';
const TRIP_MARKER_SIZE = 28;
const DEST_MARKER_W = 28;
const DEST_MARKER_H = 35;

// Custom SVG Icons for Vehicle Markers
function createVehicleIcon(status, isStale) {
  const size = 28;
  const opacity = isStale || status === 'OFFLINE' ? 0.45 : 1;
  return L.divIcon({
    html: `<img src="${CAR_MARKER_URL}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;display:block;opacity:${opacity};filter:drop-shadow(0 2px 4px rgba(15,31,25,.35))" />`,
    className: 'custom-vehicle-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -14]
  });
}

function createTripStaffIcon() {
  const size = TRIP_MARKER_SIZE;
  return L.divIcon({
    html: `<img src="${STAFF_MARKER_URL}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;display:block;filter:${TRIP_MARKER_SHADOW}" />`,
    className: 'custom-staff-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 2],
    popupAnchor: [0, -size + 4],
  });
}

function createTripDestinationIcon() {
  const w = DEST_MARKER_W;
  const h = DEST_MARKER_H;
  return L.divIcon({
    html: `<img src="${DEST_MARKER_URL}" alt="" style="width:${w}px;height:${h}px;object-fit:contain;display:block;filter:${TRIP_MARKER_SHADOW}" />`,
    className: 'custom-dest-marker',
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 2],
    popupAnchor: [0, -h + 4],
  });
}

function createDriverIcon(status = 'AVAILABLE', highlighted = false) {
  const size = highlighted ? 34 : 28;
  const ring = highlighted
    ? 'outline:3px solid rgba(220,38,38,.85);outline-offset:2px;border-radius:4px;'
    : '';
  return L.divIcon({
    html: `<img src="${CAR_MARKER_URL}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;display:block;filter:drop-shadow(0 2px 4px rgba(15,31,25,.35));${ring}" />`,
    className: 'custom-driver-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -14]
  });
}

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const run = () => {
      try {
        map.invalidateSize({ animate: false, pan: false });
      } catch {
        /* ignore resize during teardown */
      }
    };
    run();
    const t1 = window.setTimeout(run, 100);
    const t2 = window.setTimeout(run, 350);
    const onWinResize = () => requestAnimationFrame(run);
    window.addEventListener('resize', onWinResize);
    const root = map.getContainer()?.closest('.fleet-map-root');
    let ro;
    if (root && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => requestAnimationFrame(run));
      ro.observe(root);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', onWinResize);
      ro?.disconnect();
    };
  }, [map]);
  return null;
}

// Center updater helper
function ChangeView({ center, zoom, animate = true }) {
  const map = useMap();
  useEffect(() => {
    if (!isValidLatLng(center?.[0], center?.[1])) return;
    const c = [Number(center[0]), Number(center[1])];
    const z = clampMapZoom(zoom);
    if (animate) {
      map.flyTo(c, z, { duration: 1.2 });
    } else {
      map.setView(c, z);
    }
  }, [center?.[0], center?.[1], zoom, map, animate]);
  return null;
}

class FleetMapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="fleet-map-root relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl flex items-center justify-center bg-slate-100"
          style={{ height: this.props.height, minHeight: 280 }}
        >
          <div className="p-6 text-center text-sm text-slate-600 max-w-md">
            <p className="font-semibold text-slate-900">Map could not load</p>
            <p className="mt-2 text-xs leading-relaxed">
              This is usually a temporary Leaflet layout glitch (often after opening browser dev tools).
              Refresh the page or click below to try again.
            </p>
            <button
              type="button"
              className="portal-link mt-4 inline-block"
              onClick={() => this.setState({ error: null })}
            >
              Retry map
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MapCitySearch({ onSelectCity, currentLabel }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const fetchSuggestions = useCallback(async (text) => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || !MAPBOX_TOKEN) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const items = await mapboxForwardGeocode(trimmed, { limit: 8, types: 'place,locality,region' });
      setSuggestions(items);
      setOpen(items.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  const pickCity = (item) => {
    setQuery(item.label);
    setOpen(false);
    setSuggestions([]);
    onSelectCity([item.lat, item.lon], item.label, CITY_ZOOM);
  };

  const runSearch = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !MAPBOX_TOKEN) return;
    setSearching(true);
    try {
      const items = await mapboxForwardGeocode(trimmed, { limit: 1, types: 'place,locality,region' });
      if (items[0]) pickCity(items[0]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div ref={wrapRef} className="absolute top-3 left-3 z-[1000] w-full max-w-sm">
      <div className="glass-panel rounded-xl border border-slate-200/80 shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/95">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions[0]) pickCity(suggestions[0]);
                else runSearch();
              }
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder={
              currentLabel
                ? `Search city (project: ${currentLabel.split(',')[0]})…`
                : 'Search city to focus map…'
            }
            className="flex-1 min-w-0 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
            aria-label="Search city"
            autoComplete="off"
          />
          {searching && <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />}
        </div>
        {currentLabel && !open && (
          <div className="px-3 py-1.5 text-[10px] text-slate-500 border-t border-slate-100 flex items-center gap-1 bg-slate-50/90">
            <MapPin className="w-3 h-3" />
            Project area: <span className="font-semibold text-slate-700">{currentLabel}</span>
          </div>
        )}
        {open && suggestions.length > 0 && (
          <ul className="max-h-48 overflow-y-auto border-t border-slate-100 bg-white text-sm">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-brand-50 text-slate-800 border-b border-slate-50 last:border-0"
                  onClick={() => pickCity(item)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FleetMapInner({
  vehicles = [],
  drivers = [],
  selectedRequest = null,
  highlightDriverId = null,
  highlightVehicleId = null,
  center = DEFAULT_CENTER,
  zoom = CITY_ZOOM,
  defaultMapView = null,
  height = '460px',
  showCitySearch = true,
  mapShellClassName = '',
}) {
  const rootRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const initialCenter = normalizeCenter(defaultMapView?.center || center);
  const initialZoom = clampMapZoom(defaultMapView?.zoom ?? zoom);
  const initialLabel = defaultMapView?.label || DEFAULT_CITY_LABEL;
  const [cityCenter, setCityCenter] = useState(initialCenter);
  const [cityZoom, setCityZoom] = useState(initialZoom);
  const [cityLabel, setCityLabel] = useState(initialLabel);
  const [viewAnimate, setViewAnimate] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const measure = () => {
      const { width, height: h } = el.getBoundingClientRect();
      setMapReady(width > 48 && h > 48);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!defaultMapView?.center) return;
    setCityCenter(normalizeCenter(defaultMapView.center));
    setCityZoom(clampMapZoom(defaultMapView.zoom ?? CITY_ZOOM));
    setCityLabel(defaultMapView.label || DEFAULT_CITY_LABEL);
    setViewAnimate(true);
  }, [
    defaultMapView?.center?.[0],
    defaultMapView?.center?.[1],
    defaultMapView?.zoom,
    defaultMapView?.label,
    defaultMapView?.source
  ]);

  const handleSelectCity = useCallback((coords, label, z) => {
    setCityCenter(coords);
    setCityLabel(label);
    setCityZoom(z ?? CITY_ZOOM);
    setViewAnimate(true);
  }, []);

  const pickupCoords =
    selectedRequest &&
    shouldShowMovementCenterPickupPin(selectedRequest) &&
    isValidLatLng(selectedRequest.pickup_lat, selectedRequest.pickup_lng)
      ? [Number(selectedRequest.pickup_lat), Number(selectedRequest.pickup_lng)]
      : null;
  const destCoords =
    selectedRequest &&
    shouldShowMovementCenterDestPin(selectedRequest) &&
    isValidLatLng(selectedRequest.destination_lat, selectedRequest.destination_lng)
      ? [Number(selectedRequest.destination_lat), Number(selectedRequest.destination_lng)]
      : null;

  useEffect(() => {
    if (pickupCoords && destCoords && MAPBOX_TOKEN) {
      mapboxDrivingRoute(pickupCoords[0], pickupCoords[1], destCoords[0], destCoords[1])
        .then((route) => {
          if (route) {
            setRouteCoordinates(route.coordinates);
            setRouteInfo({ distanceKm: route.distanceKm, timeMins: route.timeMins });
          } else {
            setRouteCoordinates(null);
            setRouteInfo(null);
          }
        })
        .catch(() => {
          setRouteCoordinates(null);
          setRouteInfo(null);
        });
    } else {
      setRouteCoordinates(null);
      setRouteInfo(null);
    }
  }, [pickupCoords?.[0], pickupCoords?.[1], destCoords?.[0], destCoords?.[1]]);

  const assignedDriver =
    highlightDriverId && drivers.find((d) => d.id === highlightDriverId);
  const assignedVehicle =
    highlightVehicleId && vehicles.find((v) => v.id === highlightVehicleId);

  const focusCoords =
    assignedDriver?.latitude != null && isValidLatLng(assignedDriver.latitude, assignedDriver.longitude)
      ? [Number(assignedDriver.latitude), Number(assignedDriver.longitude)]
      : assignedVehicle?.latitude != null && isValidLatLng(assignedVehicle.latitude, assignedVehicle.longitude)
        ? [Number(assignedVehicle.latitude), Number(assignedVehicle.longitude)]
        : null;

  const mapCenter = normalizeCenter(focusCoords || pickupCoords || cityCenter || center);
  const mapZoom = clampMapZoom(focusCoords || pickupCoords ? 14 : cityZoom);

  const refLat = pickupCoords?.[0] ?? mapCenter[0];
  const refLng = pickupCoords?.[1] ?? mapCenter[1];
  const rankedDrivers = [...(drivers || [])]
    .filter((d) => isValidLatLng(d.latitude, d.longitude))
    .map((d) => ({
      ...d,
      distance_km: distanceKm(refLat, refLng, d.latitude, d.longitude)
    }))
    .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
    .slice(0, 6);

  const driverDistanceById = Object.fromEntries(
    rankedDrivers.map((d) => [d.id, d.distance_km])
  );

  const mapboxTiles = getMapboxLeafletTileConfig();
  const osmTiles = getOsmLeafletTileOptions();

  const rootClass = ['fleet-map-root relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl', mapShellClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={rootRef} className={rootClass} style={mapShellClassName ? undefined : { height }}>
      {showCitySearch && !pickupCoords && (
        <MapCitySearch onSelectCity={handleSelectCity} currentLabel={cityLabel} />
      )}

      {!mapReady ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500 bg-slate-100">
          Preparing map…
        </div>
      ) : (
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={2}
        maxZoom={18}
        style={{ height: '100%', width: '100%', minHeight: 280 }}
        scrollWheelZoom={true}
      >
        <MapInvalidateSize />
        <ChangeView center={mapCenter} zoom={mapZoom} animate={viewAnimate || !!pickupCoords} />
        {mapboxTiles ? (
          <TileLayer
            url={mapboxTiles.url}
            attribution={mapboxTiles.attribution}
            tileSize={mapboxTiles.tileSize}
            zoomOffset={mapboxTiles.zoomOffset}
            minZoom={mapboxTiles.minZoom}
            maxZoom={mapboxTiles.maxZoom}
            maxNativeZoom={mapboxTiles.maxNativeZoom}
          />
        ) : (
          <TileLayer
            url={osmTiles.url}
            attribution={osmTiles.attribution}
            maxZoom={osmTiles.maxZoom}
            subdomains={osmTiles.subdomains}
          />
        )}

        {/* Vehicles */}
        {vehicles.map((v) => {
          if (!isValidLatLng(v.latitude, v.longitude)) return null;
          return (
            <Marker
              key={v.id}
              position={[v.latitude, v.longitude]}
              icon={createVehicleIcon(v.map_status || v.operational_status, v.is_stale)}
            >
              <Popup className="custom-popup">
                <div className="p-2 text-slate-900 text-xs">
                  <div className="font-bold text-sm text-brand-700 flex items-center justify-between">
                    <span>{v.plate_number}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-medium">
                      {v.map_status || v.operational_status}
                    </span>
                  </div>
                  <div className="text-slate-600 font-medium mt-0.5">{v.make} {v.model}</div>
                  {v.driver && (
                    <div className="mt-1 text-slate-700">Driver: <span className="font-semibold">{v.driver.full_name}</span></div>
                  )}
                  {v.is_stale && (
                    <div className="mt-1 text-amber-800 font-medium bg-amber-50 p-1 rounded text-[10px]">
                      Stale GPS ({v.stale_duration_mins}m ago)
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Drivers (live positions) */}
        {drivers.map((d) => {
          if (!isValidLatLng(d.latitude, d.longitude)) return null;
          const pos = [Number(d.latitude), Number(d.longitude)];
          const isAssigned = highlightDriverId && d.id === highlightDriverId;
          return (
            <Marker
              key={`driver-${d.id}`}
              position={pos}
              icon={createDriverIcon(d.availability_status, isAssigned)}
              zIndexOffset={isAssigned ? 900 : 500}
            >
              <Popup className="custom-popup">
                <div className="p-2 text-slate-900 text-xs">
                  <div className="font-bold text-sm text-violet-700">
                    {isAssigned ? 'Assigned driver (live)' : 'Driver'}
                  </div>
                  <div className="font-semibold">{d.full_name}</div>
                  {d.vehicle_plate && (
                    <div className="text-slate-600 mt-0.5">Vehicle: {d.vehicle_plate}</div>
                  )}
                  {driverDistanceById[d.id] != null && (
                    <div className="text-violet-800 font-semibold mt-1">
                      {driverDistanceById[d.id]} km from pickup
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-1">{d.availability_status || 'AVAILABLE'}</div>
                  {d.is_approximate && (
                    <div className="mt-1 text-amber-800 font-medium bg-amber-50 p-1 rounded text-[10px]">
                      Approximate position (awaiting GPS)
                    </div>
                  )}
                  {d.phone_number && (
                    <div className="font-mono text-[11px] mt-1 text-slate-800">Tel: {d.phone_number}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Request Pickup Pin */}
        {pickupCoords && (
          <Marker position={pickupCoords} icon={createTripStaffIcon()} zIndexOffset={600}>
            <Popup>
              <div className="p-1 text-xs text-slate-900">
                <div className="font-bold text-brand-600">Staff location (pickup)</div>
                <div>{selectedRequest.pickup_address}</div>
                {selectedRequest.staff?.full_name && (
                  <div className="mt-1 text-slate-600">{selectedRequest.staff.full_name}</div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Request Destination Pin */}
        {destCoords && (
          <Marker position={destCoords} icon={createTripDestinationIcon()} zIndexOffset={550}>
            <Popup>
              <div className="p-1 text-xs text-slate-900">
                <div className="font-bold text-emerald-600">Destination</div>
                <div>{selectedRequest.destination_address}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Mapbox driving route (or straight polyline fallback) */}
        {pickupCoords && destCoords && (
          <Polyline
            positions={routeCoordinates && routeCoordinates.length > 0 ? routeCoordinates : [pickupCoords, destCoords]}
            color="#0ea5e9"
            weight={5}
            opacity={0.85}
            dashArray={routeCoordinates ? null : "8, 8"}
          />
        )}
      </MapContainer>
      )}

      {routeInfo && (
        <div className="absolute top-3 right-3 z-[1000] glass-panel px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-lg border border-brand-200">
          <span className="text-brand-700 font-bold">Mapbox route</span>
          <span className="font-semibold text-slate-800">{routeInfo.distanceKm} km</span>
          <span className="text-slate-400">•</span>
          <span className="font-bold text-slate-700">~{routeInfo.timeMins} min</span>
        </div>
      )}

      {rankedDrivers.length > 0 && (
        <div className="absolute top-3 right-3 z-[1000] glass-panel rounded-xl border border-violet-200/60 shadow-lg w-52 max-h-48 overflow-y-auto">
          <div className="px-3 py-2 border-b border-slate-200 text-[10px] font-bold text-violet-700 uppercase tracking-wide">
            {pickupCoords ? 'Closest drivers' : 'Drivers on map'}
          </div>
          <ul className="text-xs">
            {rankedDrivers.map((d) => (
              <li key={d.id} className="px-3 py-2 border-b border-slate-100 last:border-0">
                <div className="font-semibold text-slate-900 truncate">{d.full_name}</div>
                <div className="text-slate-500 flex justify-between gap-2">
                  <span className="truncate">{d.vehicle_plate || 'No plate'}</span>
                  <span className="font-mono text-violet-700 shrink-0">
                    {d.distance_km != null ? `${d.distance_km} km` : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] glass-panel px-3 py-2 rounded-xl text-xs flex items-center gap-3 shadow-lg">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Busy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Maintenance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span> Offline / Stale
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block"></span> Driver
        </span>
      </div>
    </div>
  );
}

export default function FleetMap(props) {
  const height =
    props.height || (props.mapShellClassName ? 'min(58vh, 640px)' : '460px');
  return (
    <FleetMapErrorBoundary height={height}>
      <FleetMapInner {...props} />
    </FleetMapErrorBoundary>
  );
}
