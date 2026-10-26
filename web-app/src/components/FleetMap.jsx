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

const MAPBOX_TOKEN = getMapboxAccessToken();

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

// Custom SVG Icons for Vehicle Markers
function createVehicleIcon(status, isStale) {
  let color = '#10b981'; // green for AVAILABLE
  if (isStale || status === 'OFFLINE') color = '#64748b'; // gray for stale
  else if (status === 'BUSY') color = '#3b82f6'; // blue for BUSY
  else if (status === 'MAINTENANCE') color = '#f59e0b'; // amber for MAINTENANCE
  else if (status === 'OUT_OF_SERVICE') color = '#ef4444'; // red for OUT_OF_SERVICE

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2"/>
      <circle cx="16" cy="16" r="10" fill="${color}"/>
      <path d="M11 15 L14 11 L18 11 L21 15 L21 19 L19 19 L19 18 L13 18 L13 19 L11 19 Z" fill="#ffffff"/>
      <circle cx="13.5" cy="18" r="1.5" fill="#0f172a"/>
      <circle cx="18.5" cy="18" r="1.5" fill="#0f172a"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'custom-vehicle-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

function createDriverIcon(status = 'AVAILABLE', highlighted = false) {
  const busy = status === 'ON_TRIP' || status === 'BUSY';
  const color = highlighted ? '#dc2626' : busy ? '#7c3aed' : '#0891b2';
  const ring = highlighted
    ? '<circle cx="16" cy="16" r="15" fill="none" stroke="#dc2626" stroke-width="3" stroke-opacity="0.85"/>'
    : '';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${highlighted ? 40 : 34}" height="${highlighted ? 40 : 34}">
      ${ring}
      <circle cx="16" cy="16" r="14" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
      <circle cx="16" cy="12" r="5" fill="#fff"/>
      <path d="M8 26c0-5 3.5-8 8-8s8 3 8 8" fill="#fff"/>
    </svg>
  `;
  const size = highlighted ? 40 : 34;
  return L.divIcon({
    html: svg,
    className: 'custom-driver-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -16]
  });
}

function createPinIcon(color = '#ef4444', label = 'P') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32">
      <path d="M12 0 C5.37 0 0 5.37 0 12 C0 21 12 32 12 32 C12 32 24 21 24 12 C24 5.37 18.63 0 12 0 Z" fill="${color}"/>
      <circle cx="12" cy="11" r="5" fill="#ffffff"/>
      <text x="12" y="14" font-size="8" font-family="sans-serif" font-weight="bold" fill="${color}" text-anchor="middle">${label}</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-pin-marker',
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32]
  });
}

// Center updater helper
function ChangeView({ center, zoom, animate = true }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      const z = zoom || 13;
      if (animate) {
        map.flyTo(center, z, { duration: 1.2 });
      } else {
        map.setView(center, z);
      }
    }
  }, [center, zoom, map, animate]);
  return null;
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

export default function FleetMap({
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
}) {
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const initialCenter = defaultMapView?.center || center;
  const initialZoom = defaultMapView?.zoom ?? zoom;
  const initialLabel = defaultMapView?.label || DEFAULT_CITY_LABEL;
  const [cityCenter, setCityCenter] = useState(initialCenter);
  const [cityZoom, setCityZoom] = useState(initialZoom);
  const [cityLabel, setCityLabel] = useState(initialLabel);
  const [viewAnimate, setViewAnimate] = useState(false);

  useEffect(() => {
    if (!defaultMapView?.center) return;
    setCityCenter(defaultMapView.center);
    setCityZoom(defaultMapView.zoom ?? CITY_ZOOM);
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

  const pickupCoords = selectedRequest?.pickup_lat ? [selectedRequest.pickup_lat, selectedRequest.pickup_lng] : null;
  const destCoords = selectedRequest?.destination_lat ? [selectedRequest.destination_lat, selectedRequest.destination_lng] : null;

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
    assignedDriver?.latitude != null
      ? [assignedDriver.latitude, assignedDriver.longitude]
      : assignedVehicle?.latitude != null
        ? [assignedVehicle.latitude, assignedVehicle.longitude]
        : null;

  const mapCenter = focusCoords || pickupCoords || cityCenter || center;
  const mapZoom = focusCoords || pickupCoords ? 14 : cityZoom;

  const refLat = pickupCoords?.[0] ?? mapCenter[0];
  const refLng = pickupCoords?.[1] ?? mapCenter[1];
  const rankedDrivers = [...(drivers || [])]
    .filter((d) => d.latitude != null && d.longitude != null)
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
  const fallbackTileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <div className="fleet-map-root relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl" style={{ height }}>
      {showCitySearch && !pickupCoords && (
        <MapCitySearch onSelectCity={handleSelectCity} currentLabel={cityLabel} />
      )}

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <ChangeView center={mapCenter} zoom={mapZoom} animate={viewAnimate || !!pickupCoords} />
        <TileLayer
          attribution={
            mapboxTiles?.attribution ||
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          }
          url={mapboxTiles?.url || fallbackTileUrl}
          tileSize={mapboxTiles?.tileSize}
          zoomOffset={mapboxTiles?.zoomOffset}
          maxZoom={mapboxTiles?.maxZoom || 20}
        />

        {/* Vehicles */}
        {vehicles.map((v) => {
          if (!v.latitude || !v.longitude) return null;
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
          if (!d.latitude || !d.longitude) return null;
          const pos = [d.latitude, d.longitude];
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
          <Marker position={pickupCoords} icon={createPinIcon('#2563eb', 'S')}>
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
          <Marker position={destCoords} icon={createPinIcon('#10b981', 'D')}>
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
