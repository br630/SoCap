# How to Find Your Google Web Client ID

## The Issue
You currently have the **Firebase App ID** in your `.env` file:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1:277931500765:web:e05010639f4fcb17556734
```

But you need the **Google OAuth Web Client ID**, which looks like:
```
277931500765-xxxxx.apps.googleusercontent.com
```

## Steps to Find the Correct Web Client ID

### Option 1: From Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **my-soca-project**
3. Click the **gear icon** (⚙️) next to "Project Overview" → **Project Settings**
4. Scroll down to the **Your apps** section
5. Find your **Web app** (the one with the `</>` icon)
6. Look for **OAuth redirect URIs** section or scroll to find:
   - **Web client ID** or
   - **OAuth 2.0 Client IDs**
7. You should see something like:
   ```
   Web client (auto created by Google Service)
   277931500765-xxxxxxxxxxxxx.apps.googleusercontent.com
   ```
8. Copy that entire string (the one ending in `.apps.googleusercontent.com`)

### Option 2: From Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **my-soca-project**
3. Go to **APIs & Services** → **Credentials**
4. Look for **OAuth 2.0 Client IDs**
5. Find the one named **Web client (auto created by Google Service)**
6. Copy the **Client ID** (it will look like `277931500765-xxxxx.apps.googleusercontent.com`)

## Update Your .env File

Once you have the correct Web Client ID, update `apps/mobile/.env`:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=277931500765-xxxxxxxxxxxxx.apps.googleusercontent.com
```

**Important:**
- Remove any spaces around the `=` sign
- Don't include quotes
- The value should end with `.apps.googleusercontent.com`

## Restart Your App

After updating the `.env` file:
1. Stop your Expo server (Ctrl+C)
2. Restart it: `npm start` or `npx expo start`
3. Clear cache if needed: `npm start -- --clear`

## Verify It's Working

After restarting, try the "Continue with Google" button again. The error should be gone!
