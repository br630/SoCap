# Fix Expo Project ID Error

## Current Issue
Your `.env` file has `EXPO_PUBLIC_PROJECT_ID=your-project-id-here` (placeholder), causing:
```
"projectId": Invalid uuid.
```

## Solution: Get Your Expo Project ID

### Option 1: From Expo Dashboard (Easiest)
1. Go to [https://expo.dev](https://expo.dev)
2. Sign in (you're logged in as "socap")
3. Click on your project "mobile" (or create one if it doesn't exist)
4. Go to Project Settings
5. Copy the **Project ID** (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Option 2: Create Project via CLI
```bash
cd apps/mobile
npx expo init --template blank
# This will create/assign a project ID
```

### Option 3: Link Existing Project
```bash
cd apps/mobile
npx expo link
```

## After Getting Project ID

1. Open `apps/mobile/.env`
2. Replace `your-project-id-here` with your actual Project ID:
   ```
   EXPO_PUBLIC_PROJECT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```
3. Restart Expo: `npx expo start --clear`

## Important: Expo Go Limitation

⚠️ **Push notifications don't work in Expo Go (SDK 53+)**. You'll see this warning:
> "Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go"

### To Test Push Notifications:
You need a **development build**:
```bash
# For Android
npx expo run:android

# For iOS  
npx expo run:ios
```

Or use EAS Build:
```bash
npx eas build --profile development --platform android
```

## Quick Fix for Now

If you just want to test the app without push notifications:
1. Comment out the notification registration in `App.tsx` temporarily
2. Or skip the project ID for now and test other features

The login error might be a separate backend issue - check if your API server is running.
