# Push Notification Setup Guide

## Step 2: Enable Cron Jobs (Backend)

Add this to your `apps/api/.env` file:

```env
ENABLE_CRON_JOBS=true
```

**How to do it:**
1. Open `apps/api/.env` in your editor
2. Add the line: `ENABLE_CRON_JOBS=true`
3. Save the file
4. Restart your API server

**Note:** If you don't have a `.env` file yet, create one in the `apps/api/` directory.

---

## Step 4: Set Expo Project ID (Mobile)

### Option A: If you have an Expo account and project

1. Go to [https://expo.dev](https://expo.dev) and sign in
2. Create a new project or select your existing project
3. Copy the **Project ID** (it looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
4. Add to `apps/mobile/.env`:

```env
EXPO_PUBLIC_PROJECT_ID=your-project-id-here
```

### Option B: If you don't have an Expo account yet

1. Install Expo CLI globally (if not already installed):
   ```bash
   npm install -g expo-cli
   ```

2. Login to Expo:
   ```bash
   npx expo login
   ```

3. Create a new project or link existing:
   ```bash
   cd apps/mobile
   npx expo init --template blank-typescript
   ```
   OR if you already have a project:
   ```bash
   npx expo whoami
   ```

4. Get your project ID:
   - Run `npx expo start` and look for the project ID in the output
   - Or check your `app.json` - it might have an `extra.eas.projectId` field
   - Or go to [expo.dev](https://expo.dev) and find it in your project settings

5. Add to `apps/mobile/.env`:
   ```env
   EXPO_PUBLIC_PROJECT_ID=your-project-id-here
   ```

### Option C: Quick way to find/get Project ID

Run this command in the mobile directory:
```bash
cd apps/mobile
npx expo config --type public | grep -i project
```

Or check if it's already in your `app.json`:
```bash
cat app.json | grep -i project
```

---

## Complete .env File Examples

### `apps/api/.env` should include:
```env
DATABASE_URL=your-database-url
ENCRYPTION_KEY=your-encryption-key
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
ENABLE_CRON_JOBS=true
PORT=3000
NODE_ENV=development
```

### `apps/mobile/.env` should include:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

---

## Verification

After setting up:

1. **Backend:** Restart your API server and check the console - you should see:
   ```
   ✅ Reminder cron jobs started
   ```

2. **Mobile:** The notification service will automatically register the device token when the app starts. Check the console for any errors.

## Troubleshooting

### Can't find Expo Project ID?
- If you're using Expo Go (development), you might not need it immediately
- For production builds, you'll need to create an Expo account and project
- The project ID is only required for push notifications via Expo's servers

### Cron jobs not starting?
- Make sure `ENABLE_CRON_JOBS=true` is set (not `ENABLE_CRON_JOBS="true"` with quotes)
- Check that `node-cron` package is installed: `npm list node-cron`
- Restart your server after adding the environment variable
