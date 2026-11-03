/** Free OSM raster tiles — same fallback as mobile-app/src/utils/mapTiles.js */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_TILE_ATTRIBUTION = '© OpenStreetMap contributors';

export function getOsmLeafletTileOptions() {
  return {
    url: OSM_TILE_URL,
    attribution: OSM_TILE_ATTRIBUTION,
    maxZoom: 19,
    subdomains: 'abc',
    keepBuffer: 6,
    updateWhenIdle: true,
    updateWhenZooming: false,
  };
}
