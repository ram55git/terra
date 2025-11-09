import geohash from 'ngeohash';

/**
 * Encode latitude/longitude to geohash
 * Precision 7 = ~153m × 153m bounding box (good for 50m clustering)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} precision - Geohash precision (default: 7)
 * @returns {string} Geohash string
 */
export const encodeGeohash = (lat, lon, precision = 7) => {
  return geohash.encode(lat, lon, precision);
};

/**
 * Decode geohash to latitude/longitude
 * @param {string} hash - Geohash string
 * @returns {{latitude: number, longitude: number}} Coordinates
 */
export const decodeGeohash = (hash) => {
  return geohash.decode(hash);
};

/**
 * Get geohash bounds for a bounding box query
 * This calculates a geohash prefix that covers the area
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {{min: string, max: string}} Min and max geohash for range query
 */
export const getGeohashRange = (centerLat, centerLon, radiusKm) => {
  // Calculate precision based on radius
  // Smaller radius = higher precision needed
  let precision;
  if (radiusKm <= 0.02) precision = 8; // ~19m
  else if (radiusKm <= 0.15) precision = 7; // ~153m
  else if (radiusKm <= 1.2) precision = 6; // ~1.2km
  else if (radiusKm <= 5) precision = 5; // ~4.9km
  else precision = 4; // ~39km

  const centerHash = geohash.encode(centerLat, centerLon, precision);
  
  return {
    min: centerHash,
    max: centerHash + '\uf8ff' // Unicode high character for range query
  };
};

/**
 * Get geohash bounds for map viewport
 * @param {{lat: number, lng: number}} southWest - Southwest corner
 * @param {{lat: number, lng: number}} northEast - Northeast corner
 * @returns {Array<{min: string, max: string}>} Array of geohash ranges to query
 */
export const getGeohashRangesForBounds = (southWest, northEast) => {
  // Calculate center and approximate radius
  const centerLat = (southWest.lat + northEast.lat) / 2;
  const centerLon = (southWest.lng + northEast.lng) / 2;
  
  // Approximate distance calculation (simple for demo)
  const latDiff = Math.abs(northEast.lat - southWest.lat);
  const lonDiff = Math.abs(northEast.lng - southWest.lng);
  const radiusKm = Math.max(latDiff, lonDiff) * 111; // rough km conversion
  
  // For large areas, we need multiple geohash prefixes
  // For now, use a single range with appropriate precision
  let precision;
  if (radiusKm <= 1) precision = 6;
  else if (radiusKm <= 10) precision = 5;
  else if (radiusKm <= 50) precision = 4;
  else if (radiusKm <= 100) precision = 3;
  else precision = 2;
  
  // Generate geohash for center with calculated precision
  const centerHash = geohash.encode(centerLat, centerLon, precision);
  
  // Return single range for simplicity
  // In production, you might want to split into multiple ranges
  return [{
    min: centerHash,
    max: centerHash + '\uf8ff'
  }];
};

/**
 * Calculate if a point is within bounds (backup client-side filter)
 * @param {{lat: number, lon: number}} point - Point to check
 * @param {{lat: number, lng: number}} southWest - Southwest corner
 * @param {{lat: number, lng: number}} northEast - Northeast corner
 * @returns {boolean} True if point is within bounds
 */
export const isWithinBounds = (point, southWest, northEast) => {
  return (
    point.lat >= southWest.lat &&
    point.lat <= northEast.lat &&
    point.lon >= southWest.lng &&
    point.lon <= northEast.lng
  );
};
