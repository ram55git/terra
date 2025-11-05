# Security Recommendations for Terra App

## Issue #8: Input Validation & Sanitization

### Current Risks
- Location coordinates (lat/lon) are accepted without validation
- Address strings from Nominatim API are stored without sanitization
- User-submitted data (selectedTiles) lacks validation

### Recommended Solutions

#### 1. Add Input Validation Utility (`src/utils/validation.js`)
```javascript
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
  
  // Validate each key is a valid category
  const validCategories = [
    'infrastructure', 'safety', 'cleanliness', 
    'environment', 'publicServices', 'community',
    'healthcare', 'education', 'transportation'
  ];
  
  return keys.every(key => 
    validCategories.includes(key) && 
    typeof tiles[key] === 'boolean'
  );
};
```

#### 2. Apply Validation in App.jsx handleSubmit

```javascript
import { isValidLatitude, isValidLongitude, sanitizeString, validateSelectedTiles } from './utils/validation';

const handleSubmit = async () => {
  // Validate location
  if (!location || !isValidLatitude(location.lat) || !isValidLongitude(location.lon)) {
    alert('Invalid location coordinates');
    return;
  }
  
  // Validate selected tiles
  if (!validateSelectedTiles(selectedTiles)) {
    alert('Invalid category selection');
    return;
  }
  
  // Sanitize address
  const sanitizedAddress = sanitizeString(address, 500);
  
  // ... rest of submission logic with sanitizedAddress
};
```

#### 3. Validate Nominatim API Response

```javascript
const successCallback = async (position) => {
  const { latitude, longitude } = position.coords;
  
  // Validate coordinates before using
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    setAddress('Invalid location coordinates');
    return;
  }
  
  setLocation({ lat: latitude, lon: longitude });
  setIsLoadingLocation(false);
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: { 'User-Agent': 'Terra-App' }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    
    // Sanitize the address from external API
    const address = sanitizeString(data.display_name || 'Address not found', 500);
    setAddress(address);
  } catch (error) {
    setAddress('Address not available');
  }
};
```

---

## Issue #9: Content Security Policy (CSP)

### Current Risks
- No CSP headers protect against XSS attacks
- Third-party scripts could be injected
- Inline scripts are not restricted

### Recommended Solutions

#### 1. Add CSP Meta Tag to `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- Content Security Policy -->
    <meta http-equiv="Content-Security-Policy" content="
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline' https://unpkg.com;
      img-src 'self' data: https: blob:;
      font-src 'self' data:;
      connect-src 'self' 
        https://*.firebaseio.com 
        https://*.googleapis.com 
        https://nominatim.openstreetmap.org
        wss://*.firebaseio.com;
      frame-src 'none';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
    ">
    
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <title>Terra - Complaint/Compliment</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Note:** The 'unsafe-inline' and 'unsafe-eval' are needed for Vite's HMR in development. For production, configure server-side CSP headers.

#### 2. Production CSP via Server Headers (Recommended)

If deploying to Netlify, create `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = """
      default-src 'self';
      script-src 'self';
      style-src 'self' 'unsafe-inline' https://unpkg.com;
      img-src 'self' data: https: blob:;
      font-src 'self' data:;
      connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://nominatim.openstreetmap.org wss://*.firebaseio.com;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
    """
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(self), camera=(), microphone=()"
```

For Vercel, create `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://nominatim.openstreetmap.org wss://*.firebaseio.com"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

#### 3. Additional Security Headers

Add these in `vite.config.js` for development:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()'
    }
  }
});
```

---

## Issue #11: HTTPS Enforcement

### Current Risks
- Geolocation API requires HTTPS in production
- Sensitive data transmitted over HTTP can be intercepted
- Mixed content warnings on HTTPS sites

### Recommended Solutions

#### 1. Local Development with HTTPS

Update `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'localhost.pem'))
    },
    port: 5173
  }
});
```

Generate local SSL certificates with mkcert:

```powershell
# Install mkcert (Windows with Chocolatey)
choco install mkcert

# Create local CA
mkcert -install

# Generate certificates
mkcert localhost 127.0.0.1 ::1
```

#### 2. Production Deployment with HTTPS

**Netlify (Automatic HTTPS):**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "http://*"
  to = "https://:splat"
  status = 301
  force = true
```

**Vercel (Automatic HTTPS):**
No configuration needed - HTTPS is automatic.

**Firebase Hosting:**
```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains; preload"
          }
        ]
      }
    ]
  }
}
```

#### 3. Add HSTS Header

Force browsers to always use HTTPS:

```javascript
// In server configuration or meta tag
<meta http-equiv="Strict-Transport-Security" content="max-age=31536000; includeSubDomains">
```

#### 4. Update External API Calls

Ensure all API calls use HTTPS:

```javascript
// ✅ Good - already using HTTPS
fetch('https://nominatim.openstreetmap.org/reverse?...')

// Firebase automatically uses HTTPS
```

---

## Additional Security Best Practices

### 1. Environment Variables Template

Create `.env.example`:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 2. Subresource Integrity (SRI)

For any external scripts or stylesheets, use SRI hashes:

```html
<link 
  rel="stylesheet" 
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-..."
  crossorigin="anonymous"
/>
```

### 3. Regular Dependency Updates

```powershell
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### 4. Deploy Firestore Rules

```powershell
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize project
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

---

## Summary Checklist

- [ ] Create `src/utils/validation.js` with input validation functions
- [ ] Add validation to `handleSubmit` in App.jsx
- [ ] Sanitize Nominatim API responses
- [ ] Add CSP meta tag to `index.html`
- [ ] Configure production CSP headers (Netlify/Vercel config)
- [ ] Set up local HTTPS for development
- [ ] Ensure production deployment uses HTTPS
- [ ] Create `.env.example` file
- [ ] Deploy Firestore security rules
- [ ] Test all security measures
- [ ] Run `npm audit` and fix vulnerabilities
