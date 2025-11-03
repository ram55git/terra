import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { clusterLocations } from '../utils/clustering';
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

// Component to center map on user location
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 15);
    }
  }, [center, zoom, map]);
  return null;
}

const MapSection = ({ location, address, isLoading }) => {
  const [submissions, setSubmissions] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [firebaseBlocked, setFirebaseBlocked] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  // Fetch all submissions from Firebase
  useEffect(() => {
    const q = query(collection(db, 'submissions'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setSubmissions(data);
      setLoadingData(false);
    }, (error) => {
      console.error('Error fetching submissions:', error);
      setLoadingData(false);
      
      // Check if it's a blocked request (ad blocker)
      if (error.code === 'unavailable' || error.message?.includes('blocked') || error.message?.includes('network')) {
        console.warn('Firebase request may be blocked by ad blocker or network issue.');
        setFirebaseBlocked(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Cluster submissions when data changes
  useEffect(() => {
    if (submissions.length > 0) {
      const clustered = clusterLocations(submissions, 0.1); // 100m threshold
      setClusters(clustered);
    } else {
      setClusters([]);
    }
  }, [submissions]);

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
      {loadingData && !firebaseBlocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">Loading reports...</p>
        </div>
      )}

      <div className="w-full h-96 rounded-lg overflow-hidden border-2 border-gray-300 relative">
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
        </div>
        <div>
        <p className="text-xs">Click markers for category breakdown</p>
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

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-800 mb-2">Category-wise Counters:</h3>
                {Object.keys(CATEGORIES).map((tileId) => {
                  const category = CATEGORIES[tileId];
                  const categoryCounts = selectedCluster.categories[category.categoryId] || { complaint: 0, compliment: 0 };
                  const total = categoryCounts.complaint + categoryCounts.compliment;
                  
                  if (total === 0) return null;

                  return (
                    <div key={tileId} className="border border-gray-200 rounded p-2 bg-gray-50">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-800 leading-tight">{category.complaint}</p>
                          <p className="text-xs text-gray-600 leading-tight">/ {category.compliment}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-base font-bold text-gray-800">{total}</p>
                          <p className="text-[10px] text-gray-500">Total</p>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs mt-1">
                        {categoryCounts.complaint > 0 && (
                          <span className="text-red-600">
                            <span className="font-semibold">C:</span> {categoryCounts.complaint}
                          </span>
                        )}
                        {categoryCounts.compliment > 0 && (
                          <span className="text-green-600">
                            <span className="font-semibold">P:</span> {categoryCounts.compliment}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {Object.keys(selectedCluster.categories).length === 0 && (
                  <p className="text-gray-500 text-xs">No category data available</p>
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
