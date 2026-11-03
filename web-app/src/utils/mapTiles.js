/** Free OSM raster tiles (no API key). Used when Mapbox token is unset at build time. */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function getOsmLeafletTileOptions() {
  return {
    url: OSM_TILE_URL,
    attribution: OSM_TILE_ATTRIBUTION,
    maxZoom: 19,
    subdomains: 'abc',
  };
}
