/** Inline Leaflet map for React Native WebView (Mapbox tiles when token is set). */
export function buildLeafletPickerHtml(lat, lng, zoom = 14, options = {}) {
  const safeLat = Number(lat) || 9.02;
  const safeLng = Number(lng) || 38.75;
  const token = options.accessToken || '';
  const style = options.style || 'mapbox/streets-v12';
  const tokenJson = JSON.stringify(token);
  const styleJson = JSON.stringify(style);

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
      var marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);
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
