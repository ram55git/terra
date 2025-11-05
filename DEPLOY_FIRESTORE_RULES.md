# Deploying Firestore Security Rules

## Prerequisites

1. Firebase CLI installed globally:
```powershell
npm install -g firebase-tools
```

2. Firebase project created at https://console.firebase.google.com/

## Steps to Deploy

### 1. Login to Firebase

```powershell
firebase login
```

This will open a browser window for authentication.

### 2. Initialize Firebase in Your Project

```powershell
firebase init
```

When prompted:
- Select **Firestore** (use spacebar to select, enter to confirm)
- Choose **Use an existing project**
- Select your Firebase project from the list
- Accept default `firestore.rules` filename (press Enter)
- Accept default `firestore.indexes.json` filename (press Enter)

### 3. Verify firestore.rules File

The `firestore.rules` file should already exist in your project root with the security rules.

### 4. Deploy the Rules

```powershell
firebase deploy --only firestore:rules
```

You should see output like:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
```

### 5. Verify Deployment

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Navigate to **Firestore Database** > **Rules**
4. Confirm the rules are deployed correctly

## Testing the Rules

### Test in Firebase Console

1. In Firestore Database > Rules, click **Rules Playground**
2. Test read/write operations with different scenarios:

**Test Read (Should succeed):**
```
Location: /submissions/test123
Read operation
```

**Test Write Without Required Fields (Should fail):**
```
Location: /submissions/test456
Write operation
Data: { "mode": "Complaint" }
```

**Test Write With Valid Data (Should succeed):**
```
Location: /submissions/test789
Write operation
Data: {
  "mode": "Complaint",
  "userId": "user_123",
  "location": {
    "lat": 40.7128,
    "lon": -74.0060
  },
  "address": "New York, NY",
  "selectedTiles": {
    "infrastructure": true
  },
  "timestamp": "2025-11-05T12:00:00.000Z"
}
```

## Common Issues

### Issue: "Permission denied" error when deploying

**Solution:** Ensure you're logged in and have the correct permissions:
```powershell
firebase logout
firebase login
```

### Issue: Rules not taking effect immediately

**Solution:** Rules are deployed immediately, but Firebase caches may take 1-2 minutes to update. Wait a moment and try again.

### Issue: App can't write to Firestore after deploying rules

**Solution:** Check that:
1. Your app is sending all required fields (mode, userId, location, address, selectedTiles, timestamp)
2. Location coordinates are valid (lat: -90 to 90, lon: -180 to 180)
3. Timestamp is a valid ISO 8601 string
4. Address is less than 500 characters

## Rate Limiting Note

The current rules include basic rate limiting checks. For production-grade rate limiting:

1. Consider using Firebase Cloud Functions with rate limiting middleware
2. Use Firebase App Check to prevent abuse
3. Monitor usage in Firebase Console > Usage & Billing

## Monitoring

Monitor rule evaluation in Firebase Console:
1. Go to **Firestore Database** > **Usage**
2. Check "Reads" and "Writes" tabs
3. Set up alerts for unusual activity

## Next Steps

After deploying rules:
- [ ] Test your app thoroughly
- [ ] Monitor Firebase usage
- [ ] Set up budget alerts in Firebase Console
- [ ] Consider implementing Firebase Authentication for stronger security
