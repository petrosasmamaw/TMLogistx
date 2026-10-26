import { getMapboxAccessToken, getMapboxStyleId } from './mapbox';

/**
 * Trip map with Mapbox driving paths (not straight lines).
 * planRouteCoords: start → end (fastest driving)
 * liveRouteCoords: driver → current leg target (fastest driving)
 */
export function buildTripMapHtml({
  centerLat,
  centerLng,
  zoom = 13,
  pickupLat,
  pickupLng,
  destLat,
  destLng,
  driverLat,
  driverLng,
  staffLat,
  staffLng,
  tripPhase = 'to_pickup',
  navigationTitle = '',
  markerMode = 'driver',
  planRouteCoords = [],
  liveRouteCoords = []
}) {
  const token = getMapboxAccessToken();
  const style = getMapboxStyleId();
  const tokenJson = JSON.stringify(token);
  const styleJson = JSON.stringify(style);

  const markers = [];

  if (pickupLat != null && pickupLng != null) {
    markers.push({ type: 'pickup', lat: pickupLat, lng: pickupLng, label: 'Start' });
  }
  if (destLat != null && destLng != null) {
    markers.push({ type: 'dest', lat: destLat, lng: destLng, label: 'End' });
  }
  if (markerMode === 'staff' && staffLat != null && staffLng != null) {
    markers.push({ type: 'staff', lat: staffLat, lng: staffLng, label: 'You' });
  }
  if (markerMode === 'driver' && driverLat != null && driverLng != null) {
    markers.push({ type: 'driver', lat: driverLat, lng: driverLng, label: 'You' });
  }
  if (markerMode === 'staff' && driverLat != null && driverLng != null) {
    markers.push({ type: 'driver', lat: driverLat, lng: driverLng, label: 'Driver' });
  }

  const phaseLabel =
    navigationTitle ||
    (tripPhase === 'ended'
      ? 'Trip ended'
      : tripPhase === 'to_dest'
        ? 'To destination'
        : 'To pickup');
  const planJson = JSON.stringify(planRouteCoords || []);
  const liveJson = JSON.stringify(liveRouteCoords || []);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    html, body, #map { height: 100%; margin: 0; background: #f2efe9; }
    .leaflet-control-attribution { font-size: 8px; }
    .phase-badge {
      position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
      z-index: 1000; background: rgba(15,23,42,.88); color: #e2e8f0;
      font: 600 10px system-ui,sans-serif; padding: 4px 10px; border-radius: 6px;
      border: 1px solid rgba(148,163,184,.4); pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="phase-badge">${phaseLabel}</div>
  <script>
    (function () {
      var mapboxToken = ${tokenJson};
      var mapboxStyle = ${styleJson};
      var markers = ${JSON.stringify(markers)};
      var planRoute = ${planJson};
      var liveRoute = ${liveJson};
      var map = L.map('map', { zoomControl: false, scrollWheelZoom: true }).setView([${centerLat}, ${centerLng}], ${zoom});
      if (mapboxToken) {
        L.tileLayer('https://api.mapbox.com/styles/v1/' + mapboxStyle + '/tiles/512/{z}/{x}/{y}@2x?access_token=' + mapboxToken, {
          tileSize: 512, zoomOffset: -1, maxZoom: 22,
          keepBuffer: 6, updateWhenZooming: false,
          attribution: '&copy; Mapbox'
        }).addTo(map);
      } else {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      }
      function icon(type) {
        if (type === 'driver') {
          return L.divIcon({
            className: '',
            html: '<div style="width:36px;height:36px;border-radius:18px;background:#f59e0b;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35)"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M5 11l1.5-4h11L19 11v5h-2v-2H7v2H5v-5zm2.2-2h9.6L16 9H8l-.8-2zM7.5 15a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg></div>',
            iconSize: [36, 36], iconAnchor: [18, 18]
          });
        }
        if (type === 'staff') {
          return L.divIcon({
            className: '',
            html: '<div style="width:28px;height:28px;border-radius:14px;background:#2563eb;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3)"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg></div>',
            iconSize: [28, 28], iconAnchor: [14, 14]
          });
        }
        if (type === 'pickup') {
          return L.divIcon({
            className: '',
            html: '<div style="width:26px;height:26px;border-radius:13px;background:#10b981;border:2px solid #fff;font-weight:800;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center">S</div>',
            iconSize: [26, 26], iconAnchor: [13, 13]
          });
        }
        return L.divIcon({
          className: '',
          html: '<div style="width:26px;height:26px;border-radius:13px;background:#ef4444;border:2px solid #fff;font-weight:800;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center">E</div>',
          iconSize: [26, 26], iconAnchor: [13, 13]
        });
      }
      var group = [];
      var driverMarker = null;
      var staffMarker = null;
      var liveLine = null;
      markers.forEach(function (m) {
        var mk = L.marker([m.lat, m.lng], { icon: icon(m.type), zIndexOffset: m.type === 'driver' ? 500 : 400 }).addTo(map);
        group.push(mk);
        if (m.type === 'driver') driverMarker = mk;
        if (m.type === 'staff') staffMarker = mk;
      });
      var planLine = null;
      var planFitted = false;
      if (planRoute.length >= 2) {
        planLine = L.polyline(planRoute, { color: '#cbd5e1', weight: 4, opacity: 0.65, dashArray: '6 8' }).addTo(map);
        planFitted = true;
      }
      if (liveRoute.length >= 2) {
        liveLine = L.polyline(liveRoute, { color: '#2563eb', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      }
      function fitAll() {
        var fit = [];
        if (planLine) fit.push(planLine);
        if (liveLine) fit.push(liveLine);
        fit = fit.concat(group);
        if (driverMarker && group.indexOf(driverMarker) === -1) fit.push(driverMarker);
        if (!fit.length) return;
        var bounds = L.featureGroup(fit).getBounds().pad(0.2);
        if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 15, animate: false });
      }
      fitAll();
      setTimeout(function () { map.invalidateSize(); }, 250);

      var anims = new WeakMap();
      function glideTo(marker, lat, lng) {
        var from = marker.getLatLng();
        if (Math.abs(from.lat - lat) < 1e-7 && Math.abs(from.lng - lng) < 1e-7) return;
        var prev = anims.get(marker);
        if (prev) cancelAnimationFrame(prev);
        var start = performance.now();
        var dur = 900;
        function step(now) {
          var t = Math.min(1, (now - start) / dur);
          var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          marker.setLatLng([from.lat + (lat - from.lat) * e, from.lng + (lng - from.lng) * e]);
          if (t < 1) anims.set(marker, requestAnimationFrame(step));
          else anims.delete(marker);
        }
        anims.set(marker, requestAnimationFrame(step));
      }

      function applyUpdate(p) {
        if (!p) return;
        if (p.planRoute && p.planRoute.length >= 2) {
          if (planLine) planLine.setLatLngs(p.planRoute);
          else planLine = L.polyline(p.planRoute, { color: '#cbd5e1', weight: 4, opacity: 0.65, dashArray: '6 8' }).addTo(map);
          if (!planFitted) {
            planFitted = true;
            if (!map.getBounds().contains(planLine.getBounds())) fitAll();
          }
        }
        if (p.driverLat != null && p.driverLng != null) {
          if (driverMarker) glideTo(driverMarker, p.driverLat, p.driverLng);
          else {
            driverMarker = L.marker([p.driverLat, p.driverLng], { icon: icon('driver'), zIndexOffset: 500 }).addTo(map);
          }
        }
        if (p.staffLat != null && p.staffLng != null) {
          if (staffMarker) glideTo(staffMarker, p.staffLat, p.staffLng);
          else {
            staffMarker = L.marker([p.staffLat, p.staffLng], { icon: icon('staff'), zIndexOffset: 400 }).addTo(map);
          }
        }
        if (p.liveRoute && p.liveRoute.length >= 2) {
          if (liveLine) liveLine.setLatLngs(p.liveRoute);
          else liveLine = L.polyline(p.liveRoute, { color: '#2563eb', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        } else if (p.liveRoute && liveLine) {
          map.removeLayer(liveLine);
          liveLine = null;
        }
        if (p.phaseLabel) {
          var badge = document.querySelector('.phase-badge');
          if (badge) badge.textContent = p.phaseLabel;
        }
      }
      window.__updateTripMap = applyUpdate;
      window.addEventListener('message', function (e) {
        var d = e && e.data;
        if (!d) return;
        if (d.type === 'TRIP_MAP_UPDATE') applyUpdate(d);
      });
    })();
  </script>
</body>
</html>`;
}

/** Request preview map: start, end, driving route only */
export function buildRequestPreviewMapHtml({
  centerLat,
  centerLng,
  pickupLat,
  pickupLng,
  destLat,
  destLng,
  planRouteCoords = []
}) {
  return buildTripMapHtml({
    centerLat,
    centerLng,
    pickupLat,
    pickupLng,
    destLat,
    destLng,
    markerMode: 'driver',
    tripPhase: 'to_pickup',
    driverLat: null,
    driverLng: null,
    planRouteCoords,
    liveRouteCoords: []
  });
}
