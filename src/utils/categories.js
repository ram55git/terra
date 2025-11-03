// Category mappings for Complaint and Compliment modes
// These categories are correlated - they represent the same issue from different perspectives

export const CATEGORIES = {
  tile1: {
    complaint: 'Pothole or Damaged Roads',
    compliment: 'Smooth, Well-Maintained Roads',
    categoryId: 'roads'
  },
  tile2: {
    complaint: 'Garbage Piled Up or Overflowing Bins',
    compliment: 'Clean Streets and Emptied Bins',
    categoryId: 'garbage'
  },
  tile3: {
    complaint: 'Blocked or Damaged Footpaths',
    compliment: 'Clear, Safe Footpaths for Walking',
    categoryId: 'footpath'
  },
  tile4: {
    complaint: 'Leaking Sewage or Open Drains',
    compliment: 'Secure and Functional Drainage',
    categoryId: 'sewage'
  },
  tile5: {
    complaint: 'No Access to Clean Drinking Water',
    compliment: 'Reliable Public Water Supply',
    categoryId: 'water'
  },
  tile6: {
    complaint: 'High Air Pollution Levels',
    compliment: 'Fresh, Breathable Air Quality',
    categoryId: 'air_quality'
  },
  tile7: {
    complaint: 'Broken or No Street Lights',
    compliment: 'Bright, Safe Street Lighting',
    categoryId: 'street_lights'
  },
  tile8: {
    complaint: 'Illegal Parking or Encroachment',
    compliment: 'Clear Public Spaces, No Encroachments',
    categoryId: 'parking'
  },
  tile9: {
    complaint: 'Health Hazards (e.g., Mosquito Breeding or Stagnant Water)',
    compliment: 'Safe, Hazard-Free Environment',
    categoryId: 'health'
  }
};

// Get category label based on mode and tile ID
export const getCategoryLabel = (tileId, mode) => {
  const category = CATEGORIES[tileId];
  if (!category) return `Tile ${tileId.replace('tile', '')}`;
  return mode === 'Complaint' ? category.complaint : category.compliment;
};

// Get category ID for correlation
export const getCategoryId = (tileId) => {
  return CATEGORIES[tileId]?.categoryId || tileId;
};

// Get all category labels for a mode
export const getCategoryLabels = (mode) => {
  return Object.keys(CATEGORIES).map(tileId => ({
    tileId,
    label: getCategoryLabel(tileId, mode),
    categoryId: getCategoryId(tileId)
  }));
};

