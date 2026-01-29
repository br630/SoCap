# Google Sign-In Setup

## Quick Fix

To enable Google Sign-In, you need to add your Google Web Client ID to your `.env` file.

### Steps:

1. **Get your Web Client ID from Firebase:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `my-soca-project`
   - Go to **Project Settings** (gear icon)
   - Scroll down to **Your apps** section
   - Click on your **Web app** (or create one if you don't have it)
   - Look for **Web client ID** (it looks like: `277931500765-xxxxx.apps.googleusercontent.com`)

2. **Add to your `.env` file:**
   - Open `apps/mobile/.env`
   - Add this line:
     ```
     EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-actual-client-id-here
     ```
   - Replace `your-actual-client-id-here` with the Web Client ID from step 1

3. **Restart your Expo app:**
   - Stop the app (Ctrl+C)
   - Run `npm start` again
   - Clear cache if needed: `npm start -- --clear`

## Network Error Fix

If you're getting "Network Error" when trying to log in:

1. **Make sure your backend server is running:**
   ```bash
   cd apps/api
   npm run dev
   ```
   You should see: `🚀 Server running on http://localhost:3000`

2. **Check your API URL:**
   - Open `apps/mobile/.env`
   - Make sure it has:
     ```
     EXPO_PUBLIC_API_URL=http://localhost:3000/api
     ```
   - For Android emulator, use: `http://10.0.2.2:3000/api`
   - For physical device on same network, use your computer's IP: `http://192.168.x.x:3000/api`

3. **Restart your mobile app** after making changes

## Testing

- **Email/Password Login:** Should work once backend is running
- **Google Sign-In:** Will work after adding the Web Client ID to `.env`
