/** Inline Leaflet map for React Native WebView (Mapbox tiles when token is set). */
export function buildLeafletPickerHtml(lat, lng, zoom = 14, options = {}) {
  const safeLat = Number(lat) || 9.0192;
  const safeLng = Number(lng) || 38.7525;
  const token = options.accessToken || '';
  const style = options.style || 'mapbox/streets-v12';
  const kind = options.markerKind === 'destination' ? 'destination' : 'pickup';
  const tokenJson = JSON.stringify(token);
  const styleJson = JSON.stringify(style);
  const pinColor = kind === 'destination' ? '#d64545' : '#0b7a5a';
  const markerHtml = `<div style="width:34px;height:42px;line-height:0;filter:drop-shadow(0 3px 6px rgba(15,31,25,.3))"><svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 24 24"><path fill="${pinColor}" stroke="#ffffff" stroke-width="1.1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.2" fill="#ffffff"/></svg></div>`;
  const markerHtmlJson = JSON.stringify(markerHtml);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    html, body { height: 100%; margin: 0; background: #e2e8f0; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var startLat = ${safeLat};
      var startLng = ${safeLng};
      var mapboxToken = ${tokenJson};
      var mapboxStyle = ${styleJson};
      var map = L.map('map', { zoomControl: true, scrollWheelZoom: true }).setView([startLat, startLng], ${zoom});
      if (mapboxToken) {
        L.tileLayer('https://api.mapbox.com/styles/v1/' + mapboxStyle + '/tiles/512/{z}/{x}/{y}@2x?access_token=' + mapboxToken, {
          tileSize: 512,
          zoomOffset: -1,
          maxZoom: 22,
          attribution: '&copy; Mapbox &copy; OpenStreetMap'
        }).addTo(map);
      } else {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);
      }
      var marker = L.marker([startLat, startLng], {
        draggable: true,
        icon: L.divIcon({
          className: '',
          html: ${markerHtmlJson},
          iconSize: [34, 42],
          iconAnchor: [17, 38]
        })
      }).addTo(map);
      function post(lat, lng) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
        }
      }
      marker.on('dragend', function () {
        var p = marker.getLatLng();
        post(p.lat, p.lng);
      });
      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        post(e.latlng.lat, e.latlng.lng);
      });
      setTimeout(function () { map.invalidateSize(); }, 200);
    })();
  </script>
</body>
</html>`;
}
