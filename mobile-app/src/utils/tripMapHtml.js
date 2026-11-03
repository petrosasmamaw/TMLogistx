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
  focusUserLat,
  focusUserLng,
  planRouteCoords = [],
  liveRouteCoords = [],
  driverIconUrl = '',
  staffIconUrl = '',
  destIconUrl = '',
  initialPickMode = null,
  initialPickLat = null,
  initialPickLng = null,
}) {
  const token = getMapboxAccessToken();
  const style = getMapboxStyleId();
  const tokenJson = JSON.stringify(token);
  const styleJson = JSON.stringify(style);
  const driverIconJson = JSON.stringify(driverIconUrl || '');
  const staffIconJson = JSON.stringify(staffIconUrl || '');
  const destIconJson = JSON.stringify(destIconUrl || '');

  const nearCoord = (aLat, aLng, bLat, bLng) => {
    if (aLat == null || aLng == null || bLat == null || bLng == null) return false;
    return Math.abs(aLat - bLat) < 0.00025 && Math.abs(aLng - bLng) < 0.00025;
  };

  const markers = [];

  if (pickupLat != null && pickupLng != null) {
    markers.push({ type: 'pickup', lat: pickupLat, lng: pickupLng, label: 'Start' });
  }
  if (destLat != null && destLng != null) {
    markers.push({ type: 'dest', lat: destLat, lng: destLng, label: 'End' });
  }
  if (
    markerMode === 'staff' &&
    staffLat != null &&
    staffLng != null &&
    !nearCoord(staffLat, staffLng, pickupLat, pickupLng)
  ) {
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
  const initialPickJson = JSON.stringify({
    mode: initialPickMode || null,
    lat: initialPickLat != null ? Number(initialPickLat) : null,
    lng: initialPickLng != null ? Number(initialPickLng) : null,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="color-scheme" content="light" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    html, body, #map { height: 100%; margin: 0; background: #dfe7e2; }
    .leaflet-control-attribution { display: none !important; }
    .carto-attr {
      position: absolute; bottom: 92px; right: 8px; z-index: 800;
      font: 500 9px system-ui,sans-serif; color: #444;
      background: rgba(255,255,255,.7); border-radius: 4px; padding: 0 4px;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="carto-attr">© OpenStreetMap · CARTO</div>
  <script>
    (function () {
      var mapboxToken = ${tokenJson};
      var mapboxStyle = ${styleJson};
      var markers = ${JSON.stringify(markers)};
      var planRoute = ${planJson};
      var liveRoute = ${liveJson};
      var pickupRefLat = ${pickupLat != null ? pickupLat : 'null'};
      var pickupRefLng = ${pickupLng != null ? pickupLng : 'null'};
      function staffShouldShow(lat, lng) {
        if (pickupRefLat == null || pickupRefLng == null) return true;
        return Math.abs(lat - pickupRefLat) >= 0.00025 || Math.abs(lng - pickupRefLng) >= 0.00025;
      }
      var map = L.map('map', { zoomControl: false, scrollWheelZoom: true }).setView([${centerLat}, ${centerLng}], ${zoom});
      if (mapboxToken) {
        L.tileLayer('https://api.mapbox.com/styles/v1/' + mapboxStyle + '/tiles/512/{z}/{x}/{y}@2x?access_token=' + mapboxToken, {
          tileSize: 512, zoomOffset: -1, maxZoom: 22,
          keepBuffer: 6, updateWhenZooming: false,
          attribution: ''
        }).addTo(map);
      } else {
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd', maxZoom: 19, attribution: ''
        }).addTo(map);
      }
      function pinIcon(color) {
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 24 24"><path fill="' + color + '" stroke="#ffffff" stroke-width="1.1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.2" fill="#ffffff"/></svg>';
        return L.divIcon({
          className: '',
          html: '<div style="width:34px;height:42px;line-height:0;filter:drop-shadow(0 3px 6px rgba(15,31,25,.25))">' + svg + '</div>',
          iconSize: [34, 42],
          iconAnchor: [17, 38]
        });
      }
      var driverCarImg = ${driverIconJson};
      var staffMarkerImg = ${staffIconJson};
      var destMarkerImg = ${destIconJson};
      function imgMarker(url, w, h, ax, ay, shadow) {
        if (!url) return null;
        var sh = shadow || 'drop-shadow(0 2px 5px rgba(15,31,25,.35))';
        return L.divIcon({
          className: '',
          html: '<img src="' + url + '" alt="" style="width:' + w + 'px;height:' + h + 'px;object-fit:contain;display:block;filter:' + sh + '" />',
          iconSize: [w, h],
          iconAnchor: [ax, ay]
        });
      }
      function staffLocationIcon() {
        var staffIc = imgMarker(staffMarkerImg, 28, 28, 14, 26);
        if (staffIc) return staffIc;
        return pinIcon('#0b7a5a');
      }
      function destinationIcon() {
        var destIc = imgMarker(destMarkerImg, 28, 35, 14, 33, 'drop-shadow(0 2px 5px rgba(15,31,25,.35))');
        if (destIc) return destIc;
        return pinIcon('#d64545');
      }
      function icon(type) {
        if (type === 'driver') {
          if (driverCarImg) {
            return L.divIcon({
              className: '',
              html: '<img src="' + driverCarImg + '" alt="" style="width:28px;height:28px;object-fit:contain;display:block;filter:drop-shadow(0 2px 5px rgba(15,31,25,.35))" />',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });
          }
          return L.divIcon({
            className: '',
            html: '<div style="width:28px;height:28px;border-radius:14px;background:#f5a524;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M5 11l1.5-4h11L19 11v5h-2v-2H7v2H5v-5z"/></svg></div>',
            iconSize: [28, 28], iconAnchor: [14, 14]
          });
        }
        if (type === 'staff' || type === 'pickup') {
          return staffLocationIcon();
        }
        if (type === 'dest') {
          return destinationIcon();
        }
        return staffLocationIcon();
      }
      function pickModeIcon(mode) {
        if (mode === 'destination') {
          return destinationIcon();
        }
        return staffLocationIcon();
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
        planLine = L.polyline(planRoute, { color: '#0b7a5a', weight: 5, opacity: 0.85, dashArray: '1 9', lineCap: 'round' }).addTo(map);
        planFitted = true;
      }
      if (liveRoute.length >= 2) {
        liveLine = L.polyline(liveRoute, { color: '#f5a524', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      }
      function fitAll() {
        var focusLat = ${focusUserLat != null ? focusUserLat : 'null'};
        var focusLng = ${focusUserLng != null ? focusUserLng : 'null'};
        if (focusLat != null && focusLng != null && (!planRoute || planRoute.length < 2)) {
          map.setView([focusLat, focusLng], ${zoom}, { animate: false });
          return;
        }
        var fit = [];
        if (planLine) fit.push(planLine);
        if (liveLine) fit.push(liveLine);
        fit = fit.concat(group);
        if (driverMarker && group.indexOf(driverMarker) === -1) fit.push(driverMarker);
        if (staffMarker && group.indexOf(staffMarker) === -1) fit.push(staffMarker);
        if (!fit.length && focusLat != null && focusLng != null) {
          map.setView([focusLat, focusLng], ${zoom}, { animate: false });
          return;
        }
        if (!fit.length) return;
        var bounds = L.featureGroup(fit).getBounds().pad(0.2);
        if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 15, animate: false });
      }
      fitAll();
      setTimeout(function () { map.invalidateSize(); }, 250);

      var activePickMode = null;
      var pickMarker = null;
      var onMapPickClick = null;

      function postMapPick(lat, lng, mode) {
        var payload = { type: 'TRIP_MAP_PICK', lat: lat, lng: lng, pickMode: mode };
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        } catch (err) {}
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(payload, '*');
          }
        } catch (err2) {}
      }

      function ensurePickMarker(lat, lng, mode) {
        var ic = pickModeIcon(mode);
        if (!pickMarker) {
          pickMarker = L.marker([lat, lng], { icon: ic, draggable: true, zIndexOffset: 900 }).addTo(map);
          pickMarker.on('dragend', function () {
            var p = pickMarker.getLatLng();
            postMapPick(p.lat, p.lng, activePickMode);
          });
        } else {
          pickMarker.setLatLng([lat, lng]);
          pickMarker.setIcon(ic);
        }
      }

      function setPickMode(mode, lat, lng) {
        if (onMapPickClick) {
          map.off('click', onMapPickClick);
          onMapPickClick = null;
        }
        activePickMode = mode || null;
        if (!activePickMode) {
          if (pickMarker) {
            map.removeLayer(pickMarker);
            pickMarker = null;
          }
          if (map.getContainer()) map.getContainer().style.cursor = '';
          return;
        }
        if (map.getContainer()) map.getContainer().style.cursor = 'crosshair';
        if (lat != null && lng != null) {
          ensurePickMarker(lat, lng, activePickMode);
          var pickZoom = activePickMode === 'destination' ? 16 : 15;
          map.setView([lat, lng], pickZoom, { animate: false });
          postMapPick(lat, lng, activePickMode);
          setTimeout(function () { map.invalidateSize(true); }, 80);
          setTimeout(function () { map.invalidateSize(true); }, 350);
        }
        onMapPickClick = function (e) {
          ensurePickMarker(e.latlng.lat, e.latlng.lng, activePickMode);
          postMapPick(e.latlng.lat, e.latlng.lng, activePickMode);
        };
        map.on('click', onMapPickClick);
      }

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
          else planLine = L.polyline(p.planRoute, { color: '#0b7a5a', weight: 5, opacity: 0.85, dashArray: '1 9', lineCap: 'round' }).addTo(map);
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
          if (!staffShouldShow(p.staffLat, p.staffLng)) {
            if (staffMarker) {
              map.removeLayer(staffMarker);
              staffMarker = null;
            }
          } else if (staffMarker) glideTo(staffMarker, p.staffLat, p.staffLng);
          else {
            staffMarker = L.marker([p.staffLat, p.staffLng], { icon: icon('staff'), zIndexOffset: 400 }).addTo(map);
          }
        }
        if (p.liveRoute && p.liveRoute.length >= 2) {
          if (liveLine) liveLine.setLatLngs(p.liveRoute);
          else liveLine = L.polyline(p.liveRoute, { color: '#f5a524', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        } else if (p.liveRoute && liveLine) {
          map.removeLayer(liveLine);
          liveLine = null;
        }
        if (
          p.focusUserLat != null &&
          p.focusUserLng != null &&
          (!p.planRoute || p.planRoute.length < 2) &&
          (!p.liveRoute || p.liveRoute.length < 2)
        ) {
          map.panTo([p.focusUserLat, p.focusUserLng], { animate: true, duration: 0.35 });
        }
        if ('pickMode' in p) {
          setPickMode(p.pickMode, p.pickLat, p.pickLng);
        } else if (p.pickLat != null && p.pickLng != null && activePickMode) {
          ensurePickMarker(p.pickLat, p.pickLng, activePickMode);
        }
      }
      window.__updateTripMap = applyUpdate;
      window.__invalidateTripMap = function () {
        try {
          map.invalidateSize(true);
        } catch (e) {}
      };
      var initialPick = ${initialPickJson};
      if (initialPick.mode && initialPick.lat != null && initialPick.lng != null) {
        setPickMode(initialPick.mode, initialPick.lat, initialPick.lng);
      }
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
  planRouteCoords = [],
  destIconUrl = '',
  staffIconUrl = '',
}) {
  return buildTripMapHtml({
    centerLat,
    centerLng,
    pickupLat,
    pickupLng,
    destLat,
    destLng,
    markerMode: 'staff',
    tripPhase: 'to_pickup',
    driverLat: null,
    driverLng: null,
    planRouteCoords,
    liveRouteCoords: [],
    destIconUrl,
    staffIconUrl,
  });
}
