/**
 * Validates latitude coordinate
 */
export const isValidLatitude = (lat) => {
  return typeof lat === 'number' && 
         !isNaN(lat) && 
         lat >= -90 && 
         lat <= 90 &&
         isFinite(lat);
};

/**
 * Validates longitude coordinate
 */
export const isValidLongitude = (lon) => {
  return typeof lon === 'number' && 
         !isNaN(lon) && 
         lon >= -180 && 
         lon <= 180 &&
         isFinite(lon);
};

/**
 * Sanitizes string input to prevent XSS
 */
export const sanitizeString = (str, maxLength = 500) => {
  if (typeof str !== 'string') return '';
  
  // Remove potentially dangerous characters
  let sanitized = str
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove inline event handlers
    .trim();
  
  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Validates selected tiles object
 */
export const validateSelectedTiles = (tiles) => {
  if (!tiles || typeof tiles !== 'object') return false;
  
  const keys = Object.keys(tiles);
  
  // Check reasonable number of selections (1-20)
  if (keys.length === 0 || keys.length > 20) return false;
  
  // Validate each key matches the tile pattern (tile1, tile2, etc.)
  const validTilePattern = /^tile\d+$/;
  
  return keys.every(key => 
    validTilePattern.test(key) && 
    typeof tiles[key] === 'boolean'
  );
};
