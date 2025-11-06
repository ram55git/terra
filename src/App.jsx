import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db, ensureAuth } from './firebase/config';
import { getUserId } from './utils/userId';
import { getCategoryId, CATEGORIES } from './utils/categories';
import { calculateDistance } from './utils/clustering';
import { isValidLatitude, isValidLongitude, sanitizeString, validateSelectedTiles } from './utils/validation';
import TileGrid from './components/TileGrid';
import MapSection from './components/MapSection';
import InfoDialog from './components/InfoDialog';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const { t } = useTranslation();
  const [mode, setMode] = useState('Complaint'); // 'Complaint' or 'Compliment'
  const [selectedTiles, setSelectedTiles] = useState({});
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const mapRefreshFnRef = useRef(null);

  // Function to get user location
  const getLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError(t('errors.locationNotSupported'));
      setIsLoadingLocation(false);
      setAddress(t('errors.locationNotSupported'));
      return;
    }

    // Check if permissions API is available (for Chrome/Edge)
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          setIsLoadingLocation(false);
          setLocationError(t('errors.locationDenied'));
          setAddress(t('errors.locationDenied'));
          return;
        }
      }).catch(() => {
        // Permission query not supported, continue anyway
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
      const { latitude, longitude } = position.coords;
      
      // Validate coordinates before using
      if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
        setLocationError(t('errors.locationUnavailable'));
        setAddress('Invalid location coordinates');
        setIsLoadingLocation(false);
        return;
      }
      
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
        
        if (!response.ok) {
          throw new Error('Geocoding failed');
        }
        
        const data = await response.json();
        
        // Sanitize the address from external API
        const sanitizedAddress = sanitizeString(data.display_name || 'Address not found', 500);
        setAddress(sanitizedAddress);
      } catch (error) {
        setAddress('Address not available');
      }
    };

    const errorCallback = (error, source = 'getCurrentPosition') => {
      const errorCode = error.code;

      setIsLoadingLocation(false);
      let errorMessage = '';
      
      if (errorCode === 1) { // PERMISSION_DENIED
        errorMessage = t('errors.locationDenied');
        setAddress(t('errors.locationDenied'));
      } else if (errorCode === 2) { // POSITION_UNAVAILABLE
        errorMessage = t('errors.locationUnavailable');
        setAddress(t('errors.locationUnavailable'));
      } else if (errorCode === 3) { // TIMEOUT
        errorMessage = t('errors.locationTimeout');
        setAddress(t('errors.locationTimeout'));
      } else {
        errorMessage = t('errors.locationTimeout');
        setAddress(t('errors.locationTimeout'));
      }
      
      setLocationError(errorMessage);
    };

    // Try getCurrentPosition first
    navigator.geolocation.getCurrentPosition(
      successCallback,
      (error) => {
        // Only try watchPosition as fallback if it's not a permission error
        if (error.code === 1) {
          // Permission denied - don't retry, just show error
          errorCallback(error, 'getCurrentPosition');
          return;
        }
        
        // If getCurrentPosition fails with timeout or unavailable, try watchPosition
        let watchId = null;
        let watchSuccess = false;
        
        const watchTimeout = setTimeout(() => {
          if (!watchSuccess && watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
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
              successCallback(position);
            }
          },
          (watchError) => {
            if (!watchSuccess) {
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
              }
              clearTimeout(watchTimeout);
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
    // Validate location exists
    if (!location) {
      if (locationError) {
        alert(locationError + '\n\n' + t('errors.retryLocation'));
      } else {
        alert(t('errors.locationNotAvailable'));
      }
      return;
    }

    // Validate location coordinates
    if (!isValidLatitude(location.lat) || !isValidLongitude(location.lon)) {
      alert('Invalid location coordinates. Please try refreshing your location.');
      return;
    }

    // Validate selected tiles
    if (!validateSelectedTiles(selectedTiles)) {
      alert(t('errors.selectAtLeastOne'));
      return;
    }

    // Get selected category IDs
    const selectedCategoryIds = Object.keys(selectedTiles)
      .filter(tileId => selectedTiles[tileId])
      .map(tileId => getCategoryId(tileId));

    if (selectedCategoryIds.length === 0) {
      alert(t('errors.selectAtLeastOne'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure user is authenticated (anonymous) before submitting
      await ensureAuth();
      
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
                ? t(`categories.${tileId}_complaint`)
                : t(`categories.${tileId}_compliment`);
            }
          }
          return catId;
        }).join(', ');

        alert(`${t('errors.alreadySubmitted')} ${duplicateCategories.length > 1 ? t('app.selectCategories') : t('app.selectCategories').slice(0, -1)}: ${categoryLabels}\n\n${t('errors.alreadySubmittedSuffix')}`);
        return;
      }

      // Proceed with submission
      // Sanitize address before storing
      const sanitizedAddress = sanitizeString(address, 500);
      
      const dataToStore = {
        mode: mode,
        userId: userId, // Add user ID to track submissions
        location: {
          lat: location.lat,
          lon: location.lon
        },
        address: sanitizedAddress,
        selectedTiles: selectedTiles,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'submissions'), dataToStore);
      
      alert(t('success.dataSubmitted'));
      
      // Refresh map to show new submission
      if (mapRefreshFnRef.current) {
        mapRefreshFnRef.current();
      }
      
      // Reset form
      setSelectedTiles({});
    } catch (error) {
      if (error.code === 'permission-denied') {
        alert(t('errors.permissionDenied'));
      } else {
        alert(t('errors.submitError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl relative">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">{t('app.title')}</h1>

          {/* Toolbar: Language + Theme */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          
          {/* Toggle Button */}
          <div className="inline-flex rounded-lg bg-white dark:bg-gray-800 shadow-md p-1 mb-6">
            <button
              onClick={() => {
                setMode('Complaint');
                setSelectedTiles({});
              }}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                mode === 'Complaint'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
              }`}
            >
              {t('app.complaint')}
            </button>
            <button
              onClick={() => {
                setMode('Compliment');
                setSelectedTiles({});
              }}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                mode === 'Compliment'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
              }`}
            >
              {t('app.compliment')}
            </button>
          </div>
        </div>

        {/* Info button (top-right) */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setIsInfoOpen(true)}
            aria-label="Show information about this site"
            className="bg-white dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full p-2 shadow hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {/* Info SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20.5A8.5 8.5 0 1 1 20.5 12 8.509 8.509 0 0 1 12 20.5z" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-transparent dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {mode === 'Complaint' ? t('app.reportComplaint') : t('app.giveCompliment')}
            </h2>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                {mode === 'Complaint' ? t('app.selectIssues') : t('app.selectCategories')} {t('app.clickTiles')}
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
              {isSubmitting ? t('app.submitting') : t('app.submit')}
            </button>
          </div>

          {/* Map Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-transparent dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {t('app.location')}
            </h2>
            {locationError && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3 whitespace-pre-line">{locationError}</p>
                <button
                  onClick={getLocation}
                  className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {t('app.retryLocation')}
                </button>
              </div>
            )}
            {isLoadingLocation && !locationError && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">{t('errors.requestingLocation')}</p>
              </div>
            )}
            <MapSection 
              location={location} 
              address={address}
              isLoading={isLoadingLocation}
              onRefresh={(fn) => { mapRefreshFnRef.current = fn; }}
            />
          </div>
        </div>
      </div>
      <InfoDialog open={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </div>
  );
}

export default App;

