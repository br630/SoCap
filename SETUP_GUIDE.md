# Complete Setup Guide - Step by Step

Follow these steps in order to get your authentication system working.

## Prerequisites

- Node.js installed
- Expo CLI installed (`npm install -g expo-cli`)
- Firebase project created
- Supabase project created (already done)

---

## Step 1: Backend API Setup

### 1.1 Install Dependencies

```bash
cd apps/api
npm install
```

### 1.2 Verify Environment Variables

Check that `apps/api/.env` exists and contains:

```bash
# Database (already configured)
DATABASE_URL="postgresql://postgres.xfyiolpjcncsqkgnhtii:Kojobo%402026@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Firebase (already configured)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"my-soca-project",...}'
```

### 1.3 Create Express Server Entry Point

Create `apps/api/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import { rateLimitMiddleware } from './middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimitMiddleware()); // Rate limiting

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 1.4 Add Start Scripts

Update `apps/api/package.json` scripts section:

```json
"scripts": {
  "start": "node dist/index.js",
  "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
  "build": "tsc",
  "test": "echo \"Error: no test specified\" && exit 1",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:push": "prisma db push",
  "db:studio": "prisma studio",
  "db:seed": "ts-node prisma/seed.ts"
}
```

### 1.5 Test Backend

```bash
cd apps/api
npm run dev
```

Open browser to `http://localhost:3000/health` - should see `{"status":"ok"}`

---

## Step 2: Firebase Configuration

### 2.1 Get Firebase Web API Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `my-soca-project`
3. Go to **Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. Click **Web** icon (`</>`) to add a web app
6. Copy the **API Key** and **App ID**

### 2.2 Enable Authentication Providers

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable these providers:
   - **Email/Password** ✅
   - **Google** (optional - click Enable, add support email)
   - **Apple** (optional - iOS only, requires Apple Developer account)

### 2.3 Configure Authorized Domains

1. In Firebase Console → Authentication → Settings
2. Add authorized domains:
   - `localhost` (for development)
   - Your production domain (when ready)

---

## Step 3: Mobile App Setup

### 3.1 Install Dependencies

```bash
cd apps/mobile
npm install
```

### 3.2 Create Environment File

Create `apps/mobile/.env`:

```bash
# Backend API URL
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Google OAuth (get from Firebase Console → Authentication → Sign-in method → Google)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id-here
```

**To get Google Web Client ID:**
1. Firebase Console → Authentication → Sign-in method
2. Click **Google** → Enable
3. Copy the **Web client ID** (not the iOS/Android ones)

### 3.3 Configure Firebase in Mobile App

#### Option A: Using Expo (Recommended for development)

1. Install Firebase SDK:
```bash
cd apps/mobile
npx expo install firebase
```

2. Create `apps/mobile/src/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "my-soca-project.firebaseapp.com",
  projectId: "my-soca-project",
  storageBucket: "my-soca-project.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

**Get these values from Firebase Console → Project Settings → Your apps → Web app**

#### Option B: Using React Native Firebase (Already installed)

If using `@react-native-firebase/auth`, you need:
- `google-services.json` (Android) - Download from Firebase Console
- `GoogleService-Info.plist` (iOS) - Download from Firebase Console

Place these files in the appropriate native directories.

### 3.4 Update authService.ts for Expo Firebase

If using Expo's Firebase, update `apps/mobile/src/services/authService.ts`:

Replace:
```typescript
import auth from '@react-native-firebase/auth';
```

With:
```typescript
import { auth } from '../config/firebase'; // Expo Firebase
```

---

## Step 4: Test Authentication Flow

### 4.1 Start Backend Server

```bash
cd apps/api
npm run dev
```

Server should start on `http://localhost:3000`

### 4.2 Start Mobile App

```bash
cd apps/mobile
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

### 4.3 Test Registration

1. Open app → Should see Login screen
2. Tap "Sign Up"
3. Fill in:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Password: password123
   - Confirm Password: password123
   - Check Terms checkbox
4. Tap "Sign Up"
5. Should create account and navigate to main app

### 4.4 Test Login

1. Sign out (if logged in)
2. Enter email and password
3. Tap "Sign In"
4. Should navigate to main app

---

## Step 5: Verify Everything Works

### 5.1 Check Backend Logs

You should see:
- Registration requests
- Login requests
- Token verification

### 5.2 Check Database

```bash
cd apps/api
npm run db:studio
```

Verify:
- User record created in `users` table
- Email matches Firebase user

### 5.3 Check Firebase Console

Go to Firebase Console → Authentication → Users
- Should see registered users
- Email should match database

---

## Step 6: Optional - Social Login Setup

### 6.1 Google Sign-In (Expo)

```bash
cd apps/mobile
npx expo install expo-auth-session expo-crypto
```

Update `authService.ts` to use Expo's auth session.

### 6.2 Apple Sign-In (iOS only)

```bash
cd apps/mobile
npx expo install expo-apple-authentication
```

Requires Apple Developer account and app configuration.

---

## Troubleshooting

### Backend Issues

**Error: Cannot connect to database**
- Check Supabase project is active
- Verify DATABASE_URL in `.env` is correct
- Try connection pooler URL if direct connection fails

**Error: Firebase Admin initialization failed**
- Verify FIREBASE_SERVICE_ACCOUNT JSON is valid
- Check JSON is on single line with escaped newlines

### Mobile App Issues

**Error: Network request failed**
- Check EXPO_PUBLIC_API_URL in `.env`
- Ensure backend server is running
- For physical device: Use your computer's IP address instead of localhost
  - Example: `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api`

**Error: Firebase not initialized**
- Verify Firebase config values
- Check Firebase project settings

**Error: Google/Apple login not working**
- Packages not installed - install required packages
- Or comment out social login buttons temporarily

---

## Quick Start Checklist

- [ ] Backend dependencies installed (`npm install` in `apps/api`)
- [ ] Backend `.env` configured (Database + Firebase)
- [ ] Backend server starts (`npm run dev`)
- [ ] Mobile dependencies installed (`npm install` in `apps/mobile`)
- [ ] Mobile `.env` created with API URL
- [ ] Firebase configured in mobile app
- [ ] Firebase Authentication enabled (Email/Password)
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Verify user in database and Firebase

---

## Next Steps After Setup

1. Replace placeholder screens in MainNavigator
2. Add more API endpoints
3. Implement contact management screens
4. Add event management features
5. Set up push notifications
6. Configure production environment variables
