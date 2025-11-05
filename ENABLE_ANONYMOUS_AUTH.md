# Enable Anonymous Authentication in Firebase

## ⚠️ IMPORTANT: Required Setup

Anonymous Authentication has been implemented in the code, but you **must enable it in Firebase Console** for it to work.

## Steps to Enable

### 1. Go to Firebase Console
Visit: https://console.firebase.google.com/

### 2. Select Your Project
Click on **terra-d9ff9** (or your project name)

### 3. Navigate to Authentication
- In the left sidebar, click **Build** → **Authentication**
- Click **Get Started** (if this is your first time)

### 4. Enable Anonymous Sign-In
- Click on the **Sign-in method** tab
- Find **Anonymous** in the list of providers
- Click on **Anonymous**
- Toggle the **Enable** switch to ON
- Click **Save**

### 5. Deploy Updated Firestore Rules
```powershell
firebase deploy --only firestore:rules
```

## How It Works

### User Experience
1. User opens the app
2. Anonymous authentication happens automatically in the background (invisible)
3. User can immediately submit complaints/compliments
4. No login screen, no password, no sign-up form

### Technical Flow
```
App loads → ensureAuth() called → Firebase creates anonymous user
  → User gets temporary UID → Can now submit data
```

### Security Benefits

**Before (without auth):**
- ❌ Anyone with projectId could write data
- ❌ No API key enforcement
- ❌ Hard to track individual users
- ❌ Difficult to implement rate limiting

**After (with anonymous auth):**
- ✅ **Requires valid API key** - Can't submit without proper Firebase credentials
- ✅ **Each device gets unique anonymous UID** - Better tracking
- ✅ **Firestore rules enforce `request.auth != null`** - No unauthenticated writes
- ✅ **Can implement per-user rate limiting** - Prevent spam from single source
- ✅ **Temporary sessions** - User gets new UID if they clear browser data

## Testing

### 1. Build and Run
```powershell
npm run build
npm run dev
```

### 2. Open Browser Console (F12)
Look for:
```
Firebase Auth: Anonymous sign-in successful
```

### 3. Test Submission
- Select a complaint/compliment
- Choose categories
- Click Submit
- Should succeed with authentication

### 4. Test Without Valid API Key
- Temporarily break the API key in `.env`
- Try to submit
- Should fail with authentication error

## Troubleshooting

### Error: "Anonymous sign-in is disabled"
**Solution:** Enable Anonymous authentication in Firebase Console (Step 4 above)

### Error: "PERMISSION_DENIED"
**Solution:** Deploy the updated Firestore rules with `request.auth != null` check

### Error: "API key not valid"
**Solution:** Check that `VITE_FIREBASE_API_KEY` in `.env` matches your Firebase Console API key

### Anonymous Users Persist
Anonymous users persist across sessions in the same browser until:
- User clears browser data (cookies, localStorage, IndexedDB)
- User uses incognito/private browsing (new session)
- User switches devices/browsers

## Verification Checklist

After enabling:
- [ ] Anonymous authentication enabled in Firebase Console
- [ ] Firestore rules deployed with `request.auth != null`
- [ ] API key is correct in `.env` file
- [ ] App can submit data successfully
- [ ] Submission without auth fails (test by disabling auth in Firebase)

## Additional Resources

- [Firebase Anonymous Auth Docs](https://firebase.google.com/docs/auth/web/anonymous-auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

**Once enabled, your app will require a valid Firebase API key for all write operations while maintaining a seamless, no-login user experience! 🔒**
