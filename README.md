# Terra - Complaint/Compliment System

A responsive web application built with React, Tailwind CSS, and Firebase for collecting user complaints or compliments with location data.

## Features

- **Toggle between Complaint and Compliment modes**
- **9-tile grid selection** (for Complaint mode) with visual feedback
- **Automatic location capture** using browser geolocation API
- **Reverse geocoding** to display address from coordinates
- **Static map display** showing user location
- **Firebase integration** for data storage

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Copy your Firebase configuration
4. Update `src/firebase/config.js` with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Set Firestore Rules (IMPORTANT!)

**This step is required for the app to work!** Without proper rules, you'll get "Missing or insufficient permissions" errors.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`terra-d9ff9`)
3. Click on **Firestore Database** in the left sidebar
4. Go to the **Rules** tab
5. Replace the existing rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /submissions/{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. Click **Publish** to save the rules

**Note:** These rules allow open read/write access. For production, implement proper authentication and security rules (e.g., only allow writes from authenticated users or with rate limiting).

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
  ├── components/
  │   ├── TileGrid.jsx       # 9-tile grid component
  │   ├── MapSection.jsx     # Map and location display
  │   └── InputSection.jsx   # Text input component
  ├── firebase/
  │   └── config.js          # Firebase configuration
  ├── App.jsx                # Main application component
  ├── main.jsx               # Application entry point
  └── index.css              # Global styles with Tailwind

```

## Usage

1. **Toggle Mode**: Click the "Complaint" or "Compliment" button
2. **Select Tiles** (Complaint mode): Click on tiles to select/deselect (green = selected, grey = unselected)
3. **Enter Details**: Optionally add additional information in the text area
4. **Submit**: Click the Submit button to save data to Firebase
   - Location (lat, lon) is automatically captured
   - Address is reverse geocoded and displayed
   - Selected tiles and mode are stored

## Data Structure in Firebase

Each submission contains:
- `mode`: "Complaint" or "Compliment"
- `location`: { lat, lon }
- `address`: Reverse geocoded address string
- `userInput`: Additional text input
- `selectedTiles`: Object with tile IDs as keys and boolean values
- `timestamp`: ISO timestamp string

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Firebase Firestore** - Database
- **OpenStreetMap/Nominatim** - Reverse geocoding and map display

## Browser Requirements

- Modern browser with geolocation API support
- Internet connection for map display and Firebase

