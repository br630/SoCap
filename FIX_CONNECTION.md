# Fix: App Still Using localhost

## ✅ Your Setup is Correct
- ✅ API server is running and accessible
- ✅ `.env` file has correct IP: `http://192.168.1.77:3000/api`
- ✅ Network connection works (you can access health endpoint)

## The Issue
Expo caches environment variables. The app needs to be restarted to pick up the new `.env` values.

## Solution: Restart Expo

### Step 1: Stop Current Expo Server
In the terminal where Expo is running:
- Press `Ctrl+C` to stop it

### Step 2: Clear Cache and Restart
```bash
cd apps/mobile
npx expo start --clear
```

The `--clear` flag clears the cache and reloads environment variables.

### Step 3: Reload App on Phone
- **Option A:** Shake your phone → Tap "Reload"
- **Option B:** In the Expo terminal, press `r` to reload
- **Option C:** Close and reopen the app

### Step 4: Verify It's Working
After reloading, try logging in. The app should now connect to `192.168.1.77:3000` instead of `localhost`.

## Debug: Check What URL App is Using

If it still doesn't work, add this temporarily to see what URL the app is using:

In `apps/mobile/src/config/api.ts`, add a console.log:
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
console.log('🔗 API URL:', API_BASE_URL); // Add this line
```

Then check the Expo logs to see what URL it's actually using.

## Alternative: Hardcode for Testing

If environment variables still don't work, you can temporarily hardcode it:

In `apps/mobile/src/config/api.ts`:
```typescript
const API_BASE_URL = 'http://192.168.1.77:3000/api'; // Hardcoded for testing
```

But remember to change it back to use the environment variable later!
