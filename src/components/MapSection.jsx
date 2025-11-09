import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { clusterLocations } from '../utils/clustering';
import { getGeohashRangesForBounds, isWithinBounds } from '../utils/geohash';
import { CATEGORIES } from '../utils/categories';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Component to center map on user location (only on initial load)
function MapController({ center, zoom }) {
  const map = useMap();
  const hasSetView = useRef(false);
  
  useEffect(() => {
    // Only set view once when center first becomes available
    if (!center || hasSetView.current) return;
    
    hasSetView.current = true;
    map.setView(center, zoom || 15);
  }, [center, zoom, map]);
  
  return null;
}

// Component to handle map viewport changes and fetch data for visible area
function MapViewportHandler({ onBoundsChange }) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const lastBoundsRef = useRef(null);
  
  const map = useMapEvents({
    moveend: () => {
      if (!hasLoaded) return;
      
      const bounds = map.getBounds();
      const boundsKey = `${bounds.getNorth()},${bounds.getSouth()},${bounds.getEast()},${bounds.getWest()}`;
      
      // Only trigger if bounds actually changed
      if (lastBoundsRef.current !== boundsKey) {
        lastBoundsRef.current = boundsKey;
        onBoundsChange(bounds);
      }
    },
    zoomend: () => {
      if (!hasLoaded) return;
      
      const bounds = map.getBounds();
      const boundsKey = `${bounds.getNorth()},${bounds.getSouth()},${bounds.getEast()},${bounds.getWest()}`;
      
      // Only trigger if bounds actually changed
      if (lastBoundsRef.current !== boundsKey) {
        lastBoundsRef.current = boundsKey;
        onBoundsChange(bounds);
      }
    },
  });

  // Trigger initial load only once
  useEffect(() => {
    const timer = setTimeout(() => {
      const bounds = map.getBounds();
      const boundsKey = `${bounds.getNorth()},${bounds.getSouth()},${bounds.getEast()},${bounds.getWest()}`;
      lastBoundsRef.current = boundsKey;
      onBoundsChange(bounds);
      setHasLoaded(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
}

// Helper to force Leaflet to recalculate dimensions when container size changes
function InvalidateOnResize({ trigger }) {
  const map = useMap();
  useEffect(() => {
    // slight delay to ensure DOM applied
    const id = setTimeout(() => {
      try { map.invalidateSize(); } catch {}
    }, 100);
    return () => clearTimeout(id);
  }, [map, trigger]);
  return null;
}

const MapSection = ({ location, address, isLoading, onRefresh }) => {
  const [submissions, setSubmissions] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [firebaseBlocked, setFirebaseBlocked] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryTab, setCategoryTab] = useState('complaints'); // 'complaints' or 'compliments'
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentBounds, setCurrentBounds] = useState(null);
  const [expandedFilter, setExpandedFilter] = useState('all'); // 'all', 'top10complaints', 'top10compliments'
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isFetchingRef = useRef(false);
  const fetchTimeoutRef = useRef(null);

  // Close expanded map with Escape key
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e) => { 
      if (e.key === 'Escape') {
        setIsExpanded(false);
        setExpandedFilter('all'); // Reset filter when closing
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isExpanded]);

  // Fetch submissions within viewport bounds
  const fetchSubmissionsInBounds = useCallback(async (bounds) => {
    if (!bounds || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    try {
      setLoadingData(true);
      
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();
      
      // Calculate 90 days ago timestamp
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      const ninetyDaysAgoISO = ninetyDaysAgo.toISOString();
      
      // OPTIMIZATION: Use geohash for efficient spatial queries
      const geohashRanges = getGeohashRangesForBounds(southWest, northEast);
      const submissionsRef = collection(db, 'submissions');
      
      // We'll query using the first geohash range
      // In production with very large areas, you might query multiple ranges
      const geohashRange = geohashRanges[0];
      
      const q = query(
        submissionsRef,
        where('geohash', '>=', geohashRange.min),
        where('geohash', '<=', geohashRange.max),
        where('timestamp', '>=', ninetyDaysAgoISO),
        orderBy('geohash'),
        orderBy('timestamp', 'desc'),
        limit(5000) // Limit to prevent excessive data transfer
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        
        // Additional client-side filter for precision (geohash gives approximate bounds)
        if (docData.location && isWithinBounds(docData.location, southWest, northEast)) {
          data.push({ id: doc.id, ...docData });
        }
      });
      
      setSubmissions(data);
      setLoadingData(false);
      setFirebaseBlocked(false);
    } catch (error) {
      setLoadingData(false);
      
      // Check if it's a blocked request (ad blocker)
      if (error.code === 'unavailable' || error.message?.includes('blocked') || error.message?.includes('network')) {
        setFirebaseBlocked(true);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Expose refresh function to parent via callback
  useEffect(() => {
    if (onRefresh) {
      const refreshFn = () => {
        setRefreshTrigger(prev => prev + 1);
      };
      onRefresh(refreshFn);
    }
  }, [onRefresh]);

  // Trigger data refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0 && currentBounds) {
      // Clear any pending timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      // Fetch immediately
      fetchSubmissionsInBounds(currentBounds);
    }
  }, [refreshTrigger, currentBounds, fetchSubmissionsInBounds]);

  // Handle viewport bounds change with debouncing
  const handleBoundsChange = useCallback((bounds) => {
    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    setCurrentBounds(bounds);
    
    // Debounce fetch by 600ms to avoid rapid successive calls
    fetchTimeoutRef.current = setTimeout(() => {
      fetchSubmissionsInBounds(bounds);
    }, 600);
  }, [fetchSubmissionsInBounds]);

  // Cluster submissions when data changes
  useEffect(() => {
    if (submissions.length > 0) {
      const clustered = clusterLocations(submissions, 0.05); // 50m threshold
      setClusters(clustered);
    } else {
      setClusters([]);
    }
  }, [submissions]);

  // Get filtered clusters for expanded view
  const getFilteredClusters = () => {
    if (expandedFilter === 'all') return clusters;
    
    // Filter and sort clusters by complaint or compliment count
    const filtered = clusters.filter(cluster => {
      if (expandedFilter === 'top10complaints') {
        return cluster.modes.Complaint > 0; // Only include clusters with complaints
      } else {
        return cluster.modes.Compliment > 0; // Only include clusters with compliments
      }
    });
    
    const sorted = filtered.sort((a, b) => {
      if (expandedFilter === 'top10complaints') {
        return b.modes.Complaint - a.modes.Complaint;
      } else {
        return b.modes.Compliment - a.modes.Compliment;
      }
    });
    
    // Return top 10
    return sorted.slice(0, 10);
  };

  // Create custom icons for markers using divIcon
  const createCustomIcon = (count, hasComplaint, hasCompliment) => {
    let iconColor = '#3388ff'; // Default blue
    if (hasComplaint && hasCompliment) {
      iconColor = '#ff8c00'; // Orange for mixed
    } else if (hasComplaint) {
      iconColor = '#dc2626'; // Red for complaints
    } else if (hasCompliment) {
      iconColor = '#22c55e'; // Green for compliments
    }

    return divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${iconColor};
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">${count}</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  };

  // Default center (can be user location or a default)
  const defaultCenter = location 
    ? [location.lat, location.lon] 
    : [40.7128, -74.0060]; // Default to NYC if no location

  return (
    <>
    <div className="space-y-4">
      {location && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-semibold">Your Location:</span>
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-semibold">Latitude:</span> {location.lat.toFixed(6)}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-semibold">Longitude:</span> {location.lon.toFixed(6)}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Address:</span> {address}
          </p>
        </div>
      )}

      {firebaseBlocked && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800 font-semibold mb-1">⚠️ Firebase Connection Blocked</p>
          <p className="text-xs text-orange-700 mb-2">
            An ad blocker or browser extension may be blocking Firebase. Please:
          </p>
          <ul className="text-xs text-orange-700 list-disc list-inside mb-2">
            <li>Disable ad blockers for this site</li>
            <li>Whitelist firestore.googleapis.com</li>
            <li>Or allow this site in your extension settings</li>
          </ul>
          <p className="text-xs text-orange-600">The map will work once Firebase can connect.</p>
        </div>
      )}

      <div className="w-full h-96 rounded-lg overflow-hidden border-2 border-gray-300 relative">
        {/* Expand (maximize) button */}
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="absolute top-2 right-2 z-[1000] bg-white/90 hover:bg-white rounded-md p-2 shadow focus:outline-none focus:ring-2 focus:ring-indigo-300"
          title="Expand map"
          aria-label="Expand map"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-700">
            <path d="M3 9V5a2 2 0 0 1 2-2h4a1 1 0 1 1 0 2H5v3a1 1 0 1 1-2 0Zm18 0V5a2 2 0 0 0-2-2h-4a1 1 0 1 0 0 2h4v3a1 1 0 1 0 2 0ZM3 15v4a2 2 0 0 0 2 2h4a1 1 0 1 0 0-2H5v-4a1 1 0 1 0-2 0Zm18 0v4a2 2 0 0 1-2 2h-4a1 1 0 1 1 0-2h4v-4a1 1 0 1 1 2 0Z" />
          </svg>
        </button>
        {isLoading ? (
          <div className="h-full bg-gray-100 flex items-center justify-center">
            <p className="text-gray-500">Loading map...</p>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={location ? 15 : 10}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Handle viewport changes */}
            <MapViewportHandler onBoundsChange={handleBoundsChange} />
            
            {/* Center map on user location if available */}
            {location && (
              <MapController center={[location.lat, location.lon]} zoom={15} />
            )}

            {/* Display clustered markers */}
            {clusters.map((cluster) => {
              const hasComplaint = cluster.modes.Complaint > 0;
              const hasCompliment = cluster.modes.Compliment > 0;
              const icon = createCustomIcon(
                cluster.count,
                hasComplaint,
                hasCompliment
              );

              return (
                <Marker
                  key={cluster.id}
                  position={[cluster.center.lat, cluster.center.lon]}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      setSelectedCluster(cluster);
                      setShowCategoryDialog(true);
                    }
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-bold text-lg mb-2">
                        {cluster.count} {cluster.count === 1 ? 'Report' : 'Reports'}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-semibold">Location:</span>{' '}
                          {cluster.center.lat.toFixed(6)}, {cluster.center.lon.toFixed(6)}
                        </p>
                        {hasComplaint && (
                          <p className="text-red-600">
                            <span className="font-semibold">Complaints:</span> {cluster.modes.Complaint}
                          </p>
                        )}
                        {hasCompliment && (
                          <p className="text-green-600">
                            <span className="font-semibold">Compliments:</span> {cluster.modes.Compliment}
                          </p>
                        )}
                        {cluster.submissions.length > 0 && cluster.submissions[0].address && (
                          <p className="text-gray-600 text-xs mt-2">
                            {cluster.submissions[0].address}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCluster(cluster);
                          setShowCategoryDialog(true);
                        }}
                        className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
                      >
                        View Category Breakdown
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* User location marker (if available) - Small dot marker */}
            {location && (
              <Marker 
                position={[location.lat, location.lon]}
                icon={divIcon({
                  className: 'user-location-marker',
                  html: `
                    <div style="
                      background-color: #3b82f6;
                      width: 16px;
                      height: 16px;
                      border-radius: 50%;
                      border: 3px solid white;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    "></div>
                  `,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8],
                  popupAnchor: [0, -8],
                })}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold mb-1">Your Current Location</h3>
                    <p className="text-sm text-gray-600">{address}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
      </div>

      {/* Expanded full-screen map overlay */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/40 z-[9000]">
          <div className="absolute inset-4 bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Filter buttons */}
            <div className="absolute top-3 left-3 z-[9100] flex gap-2">
              <button
                type="button"
                onClick={() => setExpandedFilter('all')}
                className={`px-4 py-2 rounded-md shadow font-semibold text-sm transition-all ${
                  expandedFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/90 hover:bg-white text-gray-700'
                }`}
                title="Show all reports"
              >
                All Reports
              </button>
              <button
                type="button"
                onClick={() => setExpandedFilter('top10complaints')}
                className={`px-4 py-2 rounded-md shadow font-semibold text-sm transition-all ${
                  expandedFilter === 'top10complaints'
                    ? 'bg-red-600 text-white'
                    : 'bg-white/90 hover:bg-white text-gray-700'
                }`}
                title="Show top 10 complaints"
              >
                Top 10 Complaints
              </button>
              <button
                type="button"
                onClick={() => setExpandedFilter('top10compliments')}
                className={`px-4 py-2 rounded-md shadow font-semibold text-sm transition-all ${
                  expandedFilter === 'top10compliments'
                    ? 'bg-green-600 text-white'
                    : 'bg-white/90 hover:bg-white text-gray-700'
                }`}
                title="Show top 10 compliments"
              >
                Top 10 Compliments
              </button>
            </div>
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setExpandedFilter('all'); // Reset filter when closing
              }}
              className="absolute top-3 right-3 z-[9100] bg-white/90 hover:bg-white rounded-md p-2 shadow focus:outline-none focus:ring-2 focus:ring-indigo-300"
              title="Close expanded map"
              aria-label="Close expanded map"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-700">
                <path d="M9 3H5a2 2 0 0 0-2 2v4a1 1 0 1 0 2 0V5h4a1 1 0 1 0 0-2Zm10 0h-4a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0V5a2 2 0 0 0-2-2ZM3 15a1 1 0 1 0-2 0v4a2 2 0 0 0 2 2h4a1 1 0 1 0 0-2H5v-4Zm20 0a1 1 0 1 0-2 0v4h-4a1 1 0 1 0 0 2h4a2 2 0 0 0 2-2v-4Z" />
              </svg>
            </button>
            <div className="w-full h-full">
              <MapContainer
                center={defaultCenter}
                zoom={location ? 15 : 12}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <InvalidateOnResize trigger={isExpanded} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Handle viewport changes in expanded map */}
                <MapViewportHandler onBoundsChange={handleBoundsChange} />
                
                {location && (
                  <MapController center={[location.lat, location.lon]} zoom={15} />
                )}

                {getFilteredClusters().map((cluster) => {
                  const hasComplaint = cluster.modes.Complaint > 0;
                  const hasCompliment = cluster.modes.Compliment > 0;
                  const icon = createCustomIcon(
                    cluster.count,
                    hasComplaint,
                    hasCompliment
                  );

                  return (
                    <Marker
                      key={`expanded-${cluster.id}`}
                      position={[cluster.center.lat, cluster.center.lon]}
                      icon={icon}
                      eventHandlers={{
                        click: () => {
                          setSelectedCluster(cluster);
                          setShowCategoryDialog(true);
                        }
                      }}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-bold text-lg mb-2">
                            {cluster.count} {cluster.count === 1 ? 'Report' : 'Reports'}
                          </h3>
                          <div className="space-y-1 text-sm">
                            <p>
                              <span className="font-semibold">Location:</span>{' '}
                              {cluster.center.lat.toFixed(6)}, {cluster.center.lon.toFixed(6)}
                            </p>
                            {hasComplaint && (
                              <p className="text-red-600">
                                <span className="font-semibold">Complaints:</span> {cluster.modes.Complaint}
                              </p>
                            )}
                            {hasCompliment && (
                              <p className="text-green-600">
                                <span className="font-semibold">Compliments:</span> {cluster.modes.Compliment}
                              </p>
                            )}
                            {cluster.submissions.length > 0 && cluster.submissions[0].address && (
                              <p className="text-gray-600 text-xs mt-2">
                                {cluster.submissions[0].address}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCluster(cluster);
                              setShowCategoryDialog(true);
                            }}
                            className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors"
                          >
                            View Category Breakdown
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {location && (
                  <Marker 
                    position={[location.lat, location.lon]}
                    icon={divIcon({
                      className: 'user-location-marker',
                      html: `
                        <div style="
                          background-color: #3b82f6;
                          width: 16px;
                          height: 16px;
                          border-radius: 50%;
                          border: 3px solid white;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        "></div>
                      `,
                      iconSize: [16, 16],
                      iconAnchor: [8, 8],
                      popupAnchor: [0, -8],
                    })}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold mb-1">Your Current Location</h3>
                        <p className="text-sm text-gray-600">{address}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded-full"></div>
            <span>Complaints</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded-full"></div>
            <span>Compliments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span>Mixed</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {submissions.length} report{submissions.length !== 1 ? 's' : ''} in view
        </div>
        </div>
        <div>
        <p className="text-xs">Pan/zoom map to load nearby reports • Click markers for details</p>
        </div>
    </div>

      {/* Category Breakdown Dialog - Rendered outside map container to ensure proper z-index */}
      {showCategoryDialog && selectedCluster && (
        <div className="fixed inset-0 bg-black bg-opacity-30 pointer-events-none" style={{ zIndex: 10000 }}>
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto pointer-events-auto border-2 border-gray-200" style={{ zIndex: 10001 }}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-gray-800">
                Category Breakdown
              </h2>
              <button
                onClick={() => setShowCategoryDialog(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="mb-3 pb-3 border-b">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  {selectedCluster.count} {selectedCluster.count === 1 ? 'Report' : 'Reports'}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <span className="font-semibold">Location:</span>{' '}
                  {selectedCluster.center.lat.toFixed(6)}, {selectedCluster.center.lon.toFixed(6)}
                </p>
                {selectedCluster.submissions[0]?.address && (
                  <p className="text-xs text-gray-600 line-clamp-2">
                    <span className="font-semibold">Address:</span> {selectedCluster.submissions[0].address}
                  </p>
                )}
              </div>
              
              <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex gap-4 text-xs">
                  <p className="text-red-600">
                    <span className="font-semibold">Complaints:</span> {selectedCluster.modes.Complaint}
                  </p>
                  <p className="text-green-600">
                    <span className="font-semibold">Compliments:</span> {selectedCluster.modes.Compliment}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-3 flex gap-2 border-b">
                <button
                  onClick={() => setCategoryTab('complaints')}
                  className={`px-4 py-2 font-semibold text-sm transition-colors ${
                    categoryTab === 'complaints'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Complaints ({selectedCluster.modes.Complaint})
                </button>
                <button
                  onClick={() => setCategoryTab('compliments')}
                  className={`px-4 py-2 font-semibold text-sm transition-colors ${
                    categoryTab === 'compliments'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Compliments ({selectedCluster.modes.Compliment})
                </button>
              </div>

              {/* Tab Content */}
              <div className="space-y-2">
                {categoryTab === 'complaints' && (
                  <>
                    <h3 className="font-semibold text-sm text-gray-800 mb-2">Complaint Categories:</h3>
                    {Object.keys(CATEGORIES)
                      .map((tileId) => {
                        const category = CATEGORIES[tileId];
                        const categoryCounts = selectedCluster.categories[category.categoryId] || { complaint: 0, compliment: 0 };
                        return { tileId, category, count: categoryCounts.complaint };
                      })
                      .filter(item => item.count > 0)
                      .sort((a, b) => b.count - a.count) // Sort descending by count
                      .map(({ tileId, category, count }) => (
                        <div key={tileId} className="border border-red-200 rounded p-2 bg-red-50">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-semibold text-gray-800 leading-tight flex-1">{category.complaint}</p>
                            <div className="text-right ml-2">
                              <p className="text-base font-bold text-red-600">{count}</p>
                              <p className="text-[10px] text-red-500">Report{count > 1 ? 's' : ''}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    {selectedCluster.modes.Complaint === 0 && (
                      <p className="text-gray-500 text-xs">No complaints in this cluster</p>
                    )}
                  </>
                )}
                
                {categoryTab === 'compliments' && (
                  <>
                    <h3 className="font-semibold text-sm text-gray-800 mb-2">Compliment Categories:</h3>
                    {Object.keys(CATEGORIES)
                      .map((tileId) => {
                        const category = CATEGORIES[tileId];
                        const categoryCounts = selectedCluster.categories[category.categoryId] || { complaint: 0, compliment: 0 };
                        return { tileId, category, count: categoryCounts.compliment };
                      })
                      .filter(item => item.count > 0)
                      .sort((a, b) => b.count - a.count) // Sort descending by count
                      .map(({ tileId, category, count }) => (
                        <div key={tileId} className="border border-green-200 rounded p-2 bg-green-50">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-semibold text-gray-800 leading-tight flex-1">{category.compliment}</p>
                            <div className="text-right ml-2">
                              <p className="text-base font-bold text-green-600">{count}</p>
                              <p className="text-[10px] text-green-500">Report{count > 1 ? 's' : ''}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    {selectedCluster.modes.Compliment === 0 && (
                      <p className="text-gray-500 text-xs">No compliments in this cluster</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MapSection;
