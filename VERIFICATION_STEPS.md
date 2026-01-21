# Quick Verification Steps

## 1. Verify Rules Are Published

In Firebase Console:
1. Go to Firestore Database → Rules tab
2. Look for **"Last deployed"** timestamp at the top
3. It should say "Today at [recent time]"
4. If it says an old time, click **Publish** again

## 2. Check Rules Playground (Test the Rules)

1. In Firebase Console → Firestore → Rules
2. Click **"Rules Playground"** button (top right)
3. Set up test:
   - **Location**: `/config/availability`
   - **Operation**: `create`
   - **Authenticated**: No (leave unchecked)
4. Click **"Run"**
5. Should show **"Allowed"** in green

If it shows "Denied", the rules aren't active yet.

## 3. Alternative: Create Document Manually

Skip the initialization script and create it manually:

1. Go to Firebase Console → Firestore Database → Data tab
2. Click **"Start collection"**
3. Collection ID: `config`
4. Click **"Next"**
5. Document ID: `availability`
6. Add fields manually:
   - Click **"Add field"**
   - Field: `version`, Type: string, Value: `1.0`
   - Field: `lastUpdated`, Type: string, Value: `2026-01-20`
   - Field: `schedule`, Type: map
     - Inside schedule, add fields for each day (0-6)
     - Each day is a map with a `ranges` array
7. Click **"Save"**

This bypasses the initialization script entirely.

## 4. Check Browser Cache

1. In the setup page, open DevTools (F12)
2. Go to **Network** tab
3. Check **"Disable cache"** checkbox
4. Refresh page (Ctrl+Shift+R)
5. Try initialization again

## 5. Verify Firebase Project

Double-check the project ID in the setup page matches your Firebase project:
- Open `setup_availability.html`
- Look for: `projectId: "natzconsult"`
- Verify this matches your Firebase Console project name

---

## Most Likely Issue

The rules probably haven't been published yet. Make sure you:
1. See the rules in the editor (not grayed out)
2. Click the blue **"Publish"** button
3. See a success message
4. Check "Last deployed" timestamp updates

If Rules Playground shows "Denied", the publish didn't work.
