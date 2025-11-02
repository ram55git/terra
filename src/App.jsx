import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase/config';
import { getUserId } from './utils/userId';
import { getCategoryId, CATEGORIES } from './utils/categories';
import { calculateDistance } from './utils/clustering';
import TileGrid from './components/TileGrid';
import MapSection from './components/MapSection';

function App() {
  const [mode, setMode] = useState('Complaint'); // 'Complaint' or 'Compliment'
  const [selectedTiles, setSelectedTiles] = useState({});
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Function to get user location
  const getLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLoadingLocation(false);
      setAddress('Geolocation not supported');
      return;
    }

    console.log('Attempting to get location...');

    // Check if permissions API is available (for Chrome/Edge)
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('Geolocation permission status:', result.state);
        if (result.state === 'denied') {
          setIsLoadingLocation(false);
          setLocationError('Location access was denied. Please allow location access in your browser settings.');
          setAddress('Location access denied');
          return;
        }
      }).catch((err) => {
        console.log('Permission query failed:', err);
      });
    }

    // Try with more lenient options first
    const options = {
      enableHighAccuracy: false, // Start with less accuracy requirement
      timeout: 20000, // Increased timeout to 20 seconds
      maximumAge: 300000 // Allow cached location up to 5 minutes old
    };
    
    // Create a more lenient fallback option set
    const lenientOptions = {
      enableHighAccuracy: false,
      timeout: 30000, // 30 seconds for watchPosition
      maximumAge: 600000 // Allow cached location up to 10 minutes old
    };

    const successCallback = async (position) => {
      console.log('Location obtained successfully:', position);
      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lon: longitude });
      setIsLoadingLocation(false);
      
      // Reverse geocode
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              'User-Agent': 'Terra-App'
            }
          }
        );
        const data = await response.json();
        setAddress(data.display_name || 'Address not found');
      } catch (error) {
        console.error('Error reverse geocoding:', error);
        setAddress('Address not available');
      }
    };

    const errorCallback = (error, source = 'getCurrentPosition') => {
      // Log full error details with clear formatting
      const errorCode = error.code;
      console.error('========================================');
      console.error(`Geolocation Error (${source}):`);
      console.error(`  Error Code: ${errorCode}`);
      console.error(`  Error Message: ${error.message || 'No message'}`);
      console.error(`  Code Meaning: ${errorCode === 1 ? 'PERMISSION_DENIED' : errorCode === 2 ? 'POSITION_UNAVAILABLE' : errorCode === 3 ? 'TIMEOUT' : 'UNKNOWN'}`);
      console.error('========================================');

      setIsLoadingLocation(false);
      let errorMessage = 'Unable to get your location. ';
      let detailedMessage = '';
      
      if (errorCode === 1) { // PERMISSION_DENIED
        errorMessage += 'Location access was denied.';
        detailedMessage = 'Please check your browser settings and ensure location access is allowed for this site. Click the lock icon in the address bar to manage permissions.';
        setAddress('Location access denied');
      } else if (errorCode === 2) { // POSITION_UNAVAILABLE
        errorMessage += 'Location services are unavailable.';
        detailedMessage = 'Your device cannot determine your location. This might be due to:\n• GPS/location services disabled on your device\n• No internet connection for network-based location\n• Location services not available on this device';
        setAddress('Location unavailable');
      } else if (errorCode === 3) { // TIMEOUT
        errorMessage += 'Location request timed out.';
        detailedMessage = 'The request took too long. This might be due to poor GPS signal or network issues. Please try again.';
        setAddress('Location request timed out');
      } else {
        errorMessage += 'An unknown error occurred.';
        detailedMessage = `Error code: ${errorCode}, Message: ${error.message || 'No message available'}`;
        setAddress('Location error');
      }
      
      setLocationError(errorMessage + (detailedMessage ? '\n\n' + detailedMessage : ''));
    };

    // Try getCurrentPosition first
    navigator.geolocation.getCurrentPosition(
      successCallback,
      (error) => {
        console.log('getCurrentPosition failed with error code:', error.code);
        
        // Only try watchPosition as fallback if it's not a permission error
        if (error.code === 1) {
          // Permission denied - don't retry, just show error
          errorCallback(error, 'getCurrentPosition');
          return;
        }
        
        console.log('Trying watchPosition as fallback with more lenient options...');
        // If getCurrentPosition fails with timeout or unavailable, try watchPosition
        let watchId = null;
        let watchSuccess = false;
        
        const watchTimeout = setTimeout(() => {
          if (!watchSuccess && watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            console.log('watchPosition also timed out after 30 seconds');
            errorCallback(error, 'watchPosition (timeout)');
          }
        }, lenientOptions.timeout);

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            if (!watchSuccess) {
              watchSuccess = true;
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
              }
              clearTimeout(watchTimeout);
              console.log('watchPosition succeeded!');
              successCallback(position);
            }
          },
          (watchError) => {
            if (!watchSuccess) {
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
              }
              clearTimeout(watchTimeout);
              console.log('watchPosition failed with error code:', watchError.code);
              errorCallback(watchError, 'watchPosition');
            }
          },
          lenientOptions
        );
      },
      options
    );
  };

  // Get user location on component mount
  useEffect(() => {
    getLocation();
  }, []);

  const handleTileToggle = (tileId) => {
    setSelectedTiles(prev => ({
      ...prev,
      [tileId]: !prev[tileId]
    }));
  };

  const handleSubmit = async () => {
    if (!location) {
      if (locationError) {
        alert(locationError + '\n\nPlease click "Retry Location Access" button to try again.');
      } else {
        alert('Location not available. Please enable location access in your browser and try again.');
      }
      return;
    }

    // Get selected category IDs
    const selectedCategoryIds = Object.keys(selectedTiles)
      .filter(tileId => selectedTiles[tileId])
      .map(tileId => getCategoryId(tileId));

    if (selectedCategoryIds.length === 0) {
      alert('Please select at least one category before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = getUserId();
      
      // Check for existing submissions from this user for any of the selected categories
      // Only block if same category AND same location (within 100m)
      const submissionsRef = collection(db, 'submissions');
      const q = query(submissionsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      // Store existing submissions with their categories and locations
      const existingSubmissions = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.location && data.selectedTiles) {
          const submissionCategories = [];
          Object.keys(data.selectedTiles).forEach(tileId => {
            if (data.selectedTiles[tileId]) {
              submissionCategories.push(getCategoryId(tileId));
            }
          });
          existingSubmissions.push({
            categories: submissionCategories,
            location: data.location
          });
        }
      });

      // Find categories that user has already submitted at locations within 100m
      const duplicateCategories = [];
      selectedCategoryIds.forEach(categoryId => {
        // Check if this category was submitted at any location within 100m
        const hasDuplicate = existingSubmissions.some(sub => {
          if (sub.categories.includes(categoryId)) {
            // Check if location is within 100m (0.1 km)
            const distance = calculateDistance(
              location.lat,
              location.lon,
              sub.location.lat,
              sub.location.lon
            );
            return distance <= 0.1; // 100m threshold
          }
          return false;
        });
        
        if (hasDuplicate) {
          duplicateCategories.push(categoryId);
        }
      });

      if (duplicateCategories.length > 0) {
        setIsSubmitting(false);
        const categoryLabels = duplicateCategories.map(catId => {
          // Find the tile that corresponds to this category
          for (const tileId in selectedTiles) {
            if (selectedTiles[tileId] && getCategoryId(tileId) === catId) {
              return mode === 'Complaint' 
                ? CATEGORIES[tileId].complaint
                : CATEGORIES[tileId].compliment;
            }
          }
          return catId;
        }).join(', ');
        
        alert(`You have already submitted a report for the following ${duplicateCategories.length > 1 ? 'categories' : 'category'}: ${categoryLabels}\n\nPlease select different categories or wait before submitting again for the same category.`);
        return;
      }

      // Proceed with submission
      const dataToStore = {
        mode: mode,
        userId: userId, // Add user ID to track submissions
        location: {
          lat: location.lat,
          lon: location.lon
        },
        address: address,
        selectedTiles: selectedTiles,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'submissions'), dataToStore);
      
      alert('Data submitted successfully!');
      
      // Reset form
      setSelectedTiles({});
    } catch (error) {
      console.error('Error submitting data:', error);
      if (error.code === 'permission-denied') {
        alert('Permission denied. Please update your Firestore security rules to allow writes to the "submissions" collection.\n\nGo to Firebase Console > Firestore Database > Rules and allow writes.');
      } else {
        alert('Error submitting data. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Terra</h1>
          
          {/* Toggle Button */}
          <div className="inline-flex rounded-lg bg-white shadow-md p-1 mb-6">
            <button
              onClick={() => {
                setMode('Complaint');
                setSelectedTiles({});
              }}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                mode === 'Complaint'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Complaint
            </button>
            <button
              onClick={() => {
                setMode('Compliment');
                setSelectedTiles({});
              }}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                mode === 'Compliment'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Compliment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {mode === 'Complaint' ? 'Report a Complaint' : 'Give a Compliment'}
            </h2>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                {mode === 'Complaint' ? 'Select Issues' : 'Select Categories'} (Click tiles to select/deselect):
              </h3>
              <TileGrid 
                selectedTiles={selectedTiles} 
                onTileToggle={handleTileToggle}
                mode={mode}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.values(selectedTiles).every(v => !v)}
              className={`mt-6 w-full py-3 rounded-lg font-semibold text-white shadow-md transition-all ${
                isSubmitting || Object.values(selectedTiles).every(v => !v)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : mode === 'Complaint'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          {/* Map Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Location
            </h2>
            {locationError && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 mb-3 whitespace-pre-line">{locationError}</p>
                <button
                  onClick={getLocation}
                  className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Retry Location Access
                </button>
              </div>
            )}
            {isLoadingLocation && !locationError && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">Requesting location access...</p>
              </div>
            )}
            <MapSection 
              location={location} 
              address={address}
              isLoading={isLoadingLocation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

