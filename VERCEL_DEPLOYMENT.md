# Deploying Terra App to Vercel

## ✅ Security Implementation Complete

All security recommendations have been implemented:
- ✅ Input validation (coordinates, strings, tiles)
- ✅ Content Security Policy headers
- ✅ Additional security headers (X-Frame-Options, HSTS, etc.)
- ✅ HTTPS enforcement (automatic on Vercel)
- ✅ Firestore security rules created

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **GitHub Repository**: Push your code to GitHub
3. **Firebase Project**: Set up at https://console.firebase.google.com
4. **Environment Variables**: Have your Firebase credentials ready

## Deployment Steps

### 1. Deploy Firestore Security Rules

Before deploying the app, deploy the security rules to Firebase:

```powershell
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not done already)
firebase init firestore

# Deploy the security rules
firebase deploy --only firestore:rules
```

### 2. Set Up Environment Variables

Create a `.env` file locally (for development):

```powershell
# Copy the example file
cp .env.example .env
```

Edit `.env` with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

### 3. Deploy to Vercel

#### Option A: Deploy via Vercel CLI

```powershell
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? (accept default or enter custom name)
# - Directory? ./ (press Enter)
# - Override settings? N
```

#### Option B: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**:
   ```powershell
   git add .
   git commit -m "Add security implementations"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to https://vercel.com/dashboard
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Click "Import"

3. **Configure Project**:
   - Framework Preset: **Vite** (should be auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add each variable from your `.env` file:
     - `VITE_FIREBASE_API_KEY` → your_api_key
     - `VITE_FIREBASE_AUTH_DOMAIN` → your-project.firebaseapp.com
     - `VITE_FIREBASE_PROJECT_ID` → your-project-id
     - `VITE_FIREBASE_STORAGE_BUCKET` → your-project.appspot.com
     - `VITE_FIREBASE_MESSAGING_SENDER_ID` → 123456789012
     - `VITE_FIREBASE_APP_ID` → 1:123456789012:web:abc123
   - Select all environments: Production, Preview, Development

5. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete (usually 1-2 minutes)

### 4. Verify Deployment

Once deployed, verify everything is working:

1. **Check Security Headers**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Reload the page
   - Click on the main document
   - Check Response Headers:
     - ✅ `Content-Security-Policy` should be present
     - ✅ `X-Frame-Options: DENY`
     - ✅ `Strict-Transport-Security` should be present
     - ✅ `X-Content-Type-Options: nosniff`

2. **Test Geolocation**:
   - Allow location permissions
   - Verify map centers on your location
   - HTTPS is required for geolocation (automatic on Vercel)

3. **Test Form Submission**:
   - Select complaint/compliment
   - Choose categories
   - Submit data
   - Verify success message
   - Check Firestore console for new entry

4. **Test Map Loading**:
   - Zoom/pan the map
   - Verify markers appear
   - Click markers to see details

### 5. Configure Custom Domain (Optional)

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. HTTPS/SSL is automatic for custom domains

## Automatic Deployments

Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every push to other branches or pull requests

## Environment-Specific URLs

- **Production**: `https://your-project.vercel.app`
- **Preview**: `https://your-project-git-branch.vercel.app`

## Monitoring & Analytics

### View Deployment Logs

1. Go to Vercel Dashboard
2. Select your project
3. Click "Deployments"
4. Click on any deployment to view logs

### Set Up Vercel Analytics (Optional)

```powershell
npm install @vercel/analytics
```

Add to `src/main.jsx`:

```javascript
import { inject } from '@vercel/analytics';

inject();
```

### Monitor Firebase Usage

1. Go to Firebase Console
2. Navigate to "Usage & Billing"
3. Set up budget alerts
4. Monitor Firestore reads/writes

## Security Checklist

Before going live, verify:

- [x] Firestore security rules deployed
- [x] Environment variables set in Vercel
- [x] Security headers configured (vercel.json)
- [x] Input validation implemented
- [x] HTTPS enabled (automatic)
- [x] CSP headers active
- [x] No console.log statements in production
- [x] .env file NOT committed to git
- [x] Firebase credentials secured

## Troubleshooting

### Build Fails

**Error**: "Module not found"
```powershell
# Solution: Check all imports and dependencies
npm install
npm run build
```

### Environment Variables Not Working

**Symptom**: Firebase connection fails
```
Solution:
1. Ensure all env vars have VITE_ prefix
2. Redeploy after adding variables
3. Check variable names match exactly
```

### CSP Blocking Resources

**Symptom**: Content blocked by CSP
```
Solution:
1. Check browser console for CSP violations
2. Update vercel.json CSP policy to allow the domain
3. Redeploy
```

### Geolocation Not Working

**Symptom**: "Geolocation not available"
```
Solution:
1. Ensure deployment uses HTTPS (automatic on Vercel)
2. Check browser permissions
3. Test on different browsers
```

## Updating the App

```powershell
# Make changes locally
git add .
git commit -m "Your update message"
git push origin main

# Vercel automatically deploys the changes
```

## Rollback to Previous Version

1. Go to Vercel Dashboard
2. Click "Deployments"
3. Find the previous working deployment
4. Click "..." → "Promote to Production"

## Performance Optimization

Vercel automatically provides:
- ✅ Global CDN
- ✅ Automatic compression (gzip/brotli)
- ✅ Image optimization
- ✅ Edge caching
- ✅ HTTP/2 & HTTP/3

## Cost

- **Vercel**: Free tier includes:
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS
  - Preview deployments

- **Firebase**: Free tier (Spark Plan) includes:
  - 50K reads/day
  - 20K writes/day
  - 20K deletes/day
  - 1GB storage

## Support

- **Vercel**: https://vercel.com/support
- **Firebase**: https://firebase.google.com/support
- **Project Issues**: GitHub Issues

## Next Steps

After successful deployment:
1. Share the production URL with users
2. Monitor Firebase usage
3. Set up error tracking (Sentry, LogRocket)
4. Consider adding Firebase Analytics
5. Implement Firebase Authentication for enhanced security

---

**Your app is now securely deployed with all security recommendations implemented! 🎉🔒**
