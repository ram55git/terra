// Utility functions for clustering nearby locations
import { getCategoryId } from './categories';

/**
 * Calculate distance between two coordinates in kilometers (Haversine formula)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Cluster nearby locations based on proximity threshold (in km)
 * Groups locations that are within the threshold distance (default: 50m)
 */
export const clusterLocations = (submissions, thresholdKm = 0.05) => {
  if (!submissions || submissions.length === 0) return [];

  const clusters = [];
  const processed = new Set();

  submissions.forEach((submission, index) => {
    if (processed.has(index)) return;

    const cluster = {
      id: `cluster-${index}`,
      center: {
        lat: submission.location.lat,
        lon: submission.location.lon
      },
      submissions: [submission],
      count: 1,
      modes: {
        Complaint: 0,
        Compliment: 0
      },
      categories: {} // Track category counts (correlated)
    };

    // Count mode and categories for initial submission
    if (submission.mode) {
      cluster.modes[submission.mode] = 1;
    }
    
    // Count categories from selected tiles
    if (submission.selectedTiles) {
      Object.keys(submission.selectedTiles).forEach(tileId => {
        if (submission.selectedTiles[tileId]) {
          const categoryId = getCategoryId(tileId);
          if (!cluster.categories[categoryId]) {
            cluster.categories[categoryId] = {
              complaint: 0,
              compliment: 0
            };
          }
          const modeKey = submission.mode.toLowerCase();
          cluster.categories[categoryId][modeKey] = 
            (cluster.categories[categoryId][modeKey] || 0) + 1;
        }
      });
    }

    processed.add(index);

    // Find nearby submissions
    submissions.forEach((otherSubmission, otherIndex) => {
      if (processed.has(otherIndex) || index === otherIndex) return;

      const distance = calculateDistance(
        submission.location.lat,
        submission.location.lon,
        otherSubmission.location.lat,
        otherSubmission.location.lon
      );

      if (distance <= thresholdKm) {
        cluster.submissions.push(otherSubmission);
        cluster.count += 1;
        
        // Update mode counts
        if (otherSubmission.mode) {
          cluster.modes[otherSubmission.mode] = 
            (cluster.modes[otherSubmission.mode] || 0) + 1;
        }
        
        // Update category counts
        if (otherSubmission.selectedTiles) {
          Object.keys(otherSubmission.selectedTiles).forEach(tileId => {
            if (otherSubmission.selectedTiles[tileId]) {
              const categoryId = getCategoryId(tileId);
              if (!cluster.categories[categoryId]) {
                cluster.categories[categoryId] = {
                  complaint: 0,
                  compliment: 0
                };
              }
              const modeKey = otherSubmission.mode.toLowerCase();
              cluster.categories[categoryId][modeKey] = 
                (cluster.categories[categoryId][modeKey] || 0) + 1;
            }
          });
        }

        // Calculate weighted center
        const totalLat = cluster.submissions.reduce((sum, s) => sum + s.location.lat, 0);
        const totalLon = cluster.submissions.reduce((sum, s) => sum + s.location.lon, 0);
        cluster.center = {
          lat: totalLat / cluster.submissions.length,
          lon: totalLon / cluster.submissions.length
        };

        processed.add(otherIndex);
      }
    });

    clusters.push(cluster);
  });

  return clusters;
};

