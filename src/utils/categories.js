// Category mappings for Complaint and Compliment modes
// These categories are correlated - they represent the same issue from different perspectives

export const CATEGORIES = {
  tile1: {
    complaint: 'Pothole Roads',
    compliment: 'Improved Roads',
    categoryId: 'roads'
  },
  tile2: {
    complaint: 'Garbage piled up',
    compliment: 'Garbage Cleared',
    categoryId: 'garbage'
  },
  tile3: {
    complaint: 'Footpath blocked',
    compliment: 'Footpath Cleared',
    categoryId: 'footpath'
  },
  tile4: {
    complaint: 'Sewage leaking/Open drains',
    compliment: 'Sewage fixed',
    categoryId: 'sewage'
  },
  tile5: {
    complaint: 'No Drinking water',
    compliment: 'Drinking water available',
    categoryId: 'water'
  },
  tile6: {
    complaint: 'Air pollution',
    compliment: 'Reduced Air pollution',
    categoryId: 'air_quality'
  },
  tile7: {
    complaint: 'No Street lights',
    compliment: 'Street well lit',
    categoryId: 'street_lights'
  },
  tile8: {
    complaint: 'Illegal Parking/Encroachment',
    compliment: 'Illegal Parking/Encroachment cleared',
    categoryId: 'parking'
  },
  tile9: {
    complaint: 'Health Hazard (mosquito breeding)',
    compliment: 'No Health Hazard',
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

