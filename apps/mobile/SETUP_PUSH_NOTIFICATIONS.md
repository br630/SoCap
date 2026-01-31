# Setting Up Push Notifications Properly

## Current Status
✅ **Temporary Fix Applied**: The app won't crash if Project ID is missing, but **push notifications won't work** until you complete the setup below.

## Why This Matters
- Without a valid Project ID, you can't register device tokens
- Without device tokens, the backend can't send push notifications
- The app will work fine for everything else (login, contacts, events, etc.)

## Complete Setup Steps

### Step 1: Get Your Expo Project ID

1. **Go to [expo.dev](https://expo.dev)** and sign in (you're logged in as "socap")

2. **Find or Create Your Project:**
   - If you see a project named "mobile" or "SoCap", click it
   - If not, click "Create a project" → Name it "mobile" or "SoCap"

3. **Get the Project ID:**
   - In Project Settings, find **"Project ID"**
   - It looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - Copy this UUID

### Step 2: Update Your .env File

Open `apps/mobile/.env` and update:
```env
EXPO_PUBLIC_PROJECT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```
(Replace with your actual Project ID)

### Step 3: Build a Development Build

⚠️ **Important**: Push notifications **don't work in Expo Go** (SDK 53+). You need a development build.

#### Option A: Local Development Build (Recommended for Testing)
```bash
cd apps/mobile

# For Android
npx expo run:android

# For iOS (Mac only)
npx expo run:ios
```

#### Option B: EAS Build (Cloud Build)
```bash
cd apps/mobile

# Install EAS CLI if needed
npm install -g eas-cli

# Login
eas login

# Build development version
eas build --profile development --platform android
```

### Step 4: Test Push Notifications

1. **Start your API server:**
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Open your development build** (not Expo Go)

3. **Go to Profile → Notification Settings**

4. **Click "Send Test Notification"**

5. **You should receive a notification!**

## What Happens Without Project ID?

- ✅ App works normally
- ✅ Login, contacts, events all work
- ❌ Push notifications are disabled
- ❌ Device tokens won't register
- ❌ No reminder notifications

## Quick Check

After setting up, you can verify it's working:
- Check the console logs - you should see "Device token registered successfully"
- No more warnings about Project ID
- Test notification button works

## Troubleshooting

**"Invalid uuid" error?**
- Make sure Project ID is a valid UUID format
- No extra spaces or quotes in `.env` file
- Restart Expo after updating `.env`

**Still not working?**
- Make sure you're using a development build, not Expo Go
- Check that `ENABLE_CRON_JOBS=true` in `apps/api/.env`
- Verify API server is running
- Check device token is registered in database
