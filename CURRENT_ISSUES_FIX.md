# Current Issues & Fixes

## ✅ Fixed: Invalid Project ID Error
The notification service now gracefully skips registration if the project ID is invalid, so your app won't crash.

## 🔴 Still Need to Fix: Login Error

The "Server error. Please try again later" suggests your **API server might not be running**.

### Check API Server:
1. Open a terminal
2. Go to: `cd apps/api`
3. Run: `npm run dev`
4. You should see: `🚀 Server running on http://localhost:3000`

### If API is Running:
- Check the API URL in `apps/mobile/.env`:
  ```
  EXPO_PUBLIC_API_URL=http://localhost:3000/api
  ```
- If using a physical device (not emulator), use your computer's IP:
  ```
  EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000/api
  ```
  (Replace XXX with your computer's local IP address)

## 📝 To Fully Enable Push Notifications Later:

1. **Get Expo Project ID:**
   - Go to [expo.dev](https://expo.dev)
   - Sign in as "socap"
   - Find/create your project
   - Copy the Project ID (UUID format)

2. **Update `.env`:**
   ```
   EXPO_PUBLIC_PROJECT_ID=your-actual-project-id-here
   ```

3. **Build Development Build** (push notifications don't work in Expo Go):
   ```bash
   cd apps/mobile
   npx expo run:android
   # or
   npx expo run:ios
   ```

## 🎯 Next Steps:
1. **Start your API server** (if not running)
2. **Reload the app** - the notification error should be gone
3. **Test login** - should work once API is running
