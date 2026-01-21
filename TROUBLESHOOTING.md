# Troubleshooting: Slow Initialization

## Common Causes

### 1. Firestore Rules Not Deployed ⚠️
**Most Common Issue**

The initialization will hang or fail if security rules haven't been deployed.

**Solution:**
```powershell
# Option A: Firebase Console (2 minutes)
1. Go to https://console.firebase.google.com/
2. Select: natzconsul
3. Firestore Database → Rules
4. Copy content from firestore.rules
5. Paste and click Publish

# Option B: Firebase CLI
cd c:\Users\user\.gemini\antigravity\scratch\edu
firebase deploy --only firestore:rules
```

### 2. Network/Firestore Connectivity
Check if Firebase services are reachable.

**Test:**
Open browser console (F12) and check for:
- Network errors
- CORS errors
- Firebase connection errors

### 3. Browser Cache
Old JavaScript may be cached.

**Solution:**
- Hard refresh: `Ctrl + Shift + R`
- Clear cache and reload

### 4. Firestore Quota Limits
Free tier has limits on writes.

**Check:**
Firebase Console → Firestore → Usage tab

---

## Quick Diagnostic Steps

1. **Open Browser Console** (F12)
   - Look for red errors
   - Check what's being logged

2. **Check Network Tab**
   - See if requests to Firestore are pending
   - Look for failed requests (red)

3. **Verify Rules Deployed**
   - Firebase Console → Firestore → Rules
   - Check "Last deployed" timestamp

4. **Test with Timeout**
   - Refresh `setup_availability.html`
   - New version has 15-second timeout
   - Will show specific error if it hangs

---

## Expected Behavior

**Normal initialization:**
1. Click "Initialize Now"
2. Shows "Connecting to Firestore..." (1-2 seconds)
3. Shows "Writing schedule data..." (1-2 seconds)
4. Success message appears (total: 2-5 seconds)

**If taking longer than 15 seconds:**
- Something is wrong
- Check the diagnostic steps above

---

## Manual Alternative

If automated setup keeps failing, you can manually create the document:

1. Go to Firebase Console → Firestore Database
2. Click "Start collection"
3. Collection ID: `config`
4. Document ID: `availability`
5. Add fields:
   ```
   schedule (map):
     0 (map):
       ranges (array): []
     1 (map):
       ranges (array):
         0 (map):
           start (number): 15
           end (number): 16
     2 (map):
       ranges (array): []
     3 (map):
       ranges (array):
         0 (map):
           start (number): 15
           end (number): 16
     4 (map):
       ranges (array): []
     5 (map):
       ranges (array):
         0 (map):
           start (number): 10
           end (number): 12
         1 (map):
           start (number): 15
           end (number): 16
     6 (map):
       ranges (array): []
   
   lastUpdated (string): "2026-01-20T..."
   version (string): "1.0"
   ```

---

## Still Having Issues?

1. Check browser console for specific error codes
2. Verify Firebase project ID is correct: `natzconsul`
3. Ensure you have internet connectivity
4. Try a different browser
5. Check if Firebase is experiencing outages: https://status.firebase.google.com/
