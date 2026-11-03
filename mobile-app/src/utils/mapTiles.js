/** Free OSM raster tiles (no API key). Used when Mapbox token is unset. */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_TILE_ATTRIBUTION = '© OpenStreetMap contributors';

export function getOsmLeafletTileOptions() {
  return {
    url: OSM_TILE_URL,
    attribution: OSM_TILE_ATTRIBUTION,
    maxZoom: 19,
  };
}
