# Step-by-Step Setup Instructions

Follow these steps **in order** to get your authentication system working.

---

## ✅ STEP 1: Backend API Setup

### 1.1 Install Backend Dependencies

```bash
cd apps/api
npm install
```

**Expected output:** Packages installed successfully

---

### 1.2 Verify Environment Variables

Check that `apps/api/.env` file exists and has:

```bash
DATABASE_URL="postgresql://postgres.xfyiolpjcncsqkgnhtii:Kojobo%402026@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"my-soca-project",...}'
```

✅ **Already configured** - Your `.env` file is set up!

---

### 1.3 Start Backend Server

```bash
cd apps/api
npm run dev
```

**Expected output:**
```
🚀 Server running on http://localhost:3000
📊 Health check: http://localhost:3000/health
🔐 Auth endpoints: http://localhost:3000/api/auth
```

**Test it:** Open browser to `http://localhost:3000/health` - should see `{"status":"ok"}`

✅ **Backend is running!**

---

## ✅ STEP 2: Firebase Configuration

### 2.1 Get Firebase Web Config

1. Go to: https://console.firebase.google.com/
2. Select project: **my-soca-project**
3. Click **⚙️ Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. If no web app exists:
   - Click **Add app** → Select **Web** (`</>` icon)
   - Register app name: `SoCap Web`
   - Click **Register app**
6. Copy these values:
   - **apiKey**
   - **authDomain**
   - **projectId** (should be `my-soca-project`)
   - **storageBucket**
   - **messagingSenderId**
   - **appId**

---

### 2.2 Enable Authentication Providers

1. In Firebase Console, click **Authentication** in left sidebar
2. Click **Get Started** (if first time)
3. Go to **Sign-in method** tab
4. Enable **Email/Password**:
   - Click **Email/Password**
   - Toggle **Enable** to ON
   - Click **Save**

5. (Optional) Enable **Google**:
   - Click **Google**
   - Toggle **Enable** to ON
   - Enter support email
   - Click **Save**
   - Copy the **Web client ID** (you'll need this)

6. (Optional) Enable **Apple** (iOS only):
   - Click **Apple**
   - Toggle **Enable** to ON
   - Follow setup instructions

✅ **Firebase Authentication is configured!**

---

## ✅ STEP 3: Mobile App Setup

### 3.1 Install Mobile Dependencies

```bash
cd apps/mobile
npm install
```

**Expected output:** Packages installed successfully

---

### 3.2 Create Mobile Environment File

Create file: `apps/mobile/.env`

**For local development (using your computer's IP):**

1. Find your computer's IP address:
   - Windows: Open Command Prompt, type `ipconfig`, look for IPv4 Address
   - Mac/Linux: Open Terminal, type `ifconfig` or `ip addr`

2. Create `.env` file with:

```bash
# Replace YOUR_IP_ADDRESS with your actual IP (e.g., 192.168.1.100)
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000/api

# Get from Firebase Console → Authentication → Sign-in method → Google → Web client ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id-here
```

**Example:**
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

**Note:** If testing on iOS Simulator or Android Emulator, you can use:
```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

---

### 3.3 Configure Firebase in Mobile App

Since you're using Expo, we'll use Expo's Firebase SDK.

**Option 1: Install Expo Firebase (Recommended)**

```bash
cd apps/mobile
npx expo install firebase
```

**Option 2: Use React Native Firebase (Already installed)**

If you want to use `@react-native-firebase/auth` instead, you'll need to:
- Build a development build (not Expo Go)
- Add native Firebase config files

**For now, let's use Expo Firebase:**

```bash
cd apps/mobile
npx expo install firebase
```

Then create `apps/mobile/src/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Get these from Firebase Console → Project Settings → Your apps → Web app
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "my-soca-project.firebaseapp.com",
  projectId: "my-soca-project",
  storageBucket: "my-soca-project.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

**Replace the values** with what you copied from Firebase Console.

---

### 3.4 Update authService.ts for Expo Firebase

Update `apps/mobile/src/services/authService.ts`:

**Find this line (around line 1):**
```typescript
import auth from '@react-native-firebase/auth';
```

**Replace with:**
```typescript
import { auth } from '../config/firebase';
```

**Also update all `auth()` calls to just `auth`:**

Find and replace:
- `auth().createUserWithEmailAndPassword` → `createUserWithEmailAndPassword(auth, ...)`
- `auth().signInWithEmailAndPassword` → `signInWithEmailAndPassword(auth, ...)`
- `auth().signOut()` → `signOut(auth)`
- `auth().currentUser` → `auth.currentUser`
- `auth().onAuthStateChanged` → `onAuthStateChanged(auth, ...)`
- `auth().sendPasswordResetEmail` → `sendPasswordResetEmail(auth, ...)`

Actually, let me create an updated version that works with Expo Firebase.

---

## ✅ STEP 4: Test the Setup

### 4.1 Start Backend (Terminal 1)

```bash
cd apps/api
npm run dev
```

**Keep this running!** You should see:
```
🚀 Server running on http://localhost:3000
```

---

### 4.2 Start Mobile App (Terminal 2)

```bash
cd apps/mobile
npm start
```

**Options:**
- Press `i` for iOS simulator
- Press `a` for Android emulator  
- Scan QR code with Expo Go app on your phone

---

### 4.3 Test Registration

1. App opens → Should see **Login** screen
2. Tap **"Sign Up"** button
3. Fill in the form:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
   - ✅ Check "I accept terms" checkbox
4. Tap **"Sign Up"** button
5. **Expected:** Account created, navigates to main app

**If error:** Check backend terminal for error messages

---

### 4.4 Test Login

1. Sign out (if logged in)
2. Enter email: `test@example.com`
3. Enter password: `password123`
4. Tap **"Sign In"** button
5. **Expected:** Logs in, navigates to main app

---

## ✅ STEP 5: Verify Everything

### 5.1 Check Backend Logs

In backend terminal, you should see:
- `POST /api/auth/register` requests
- `POST /api/auth/login` requests
- Token verification logs

### 5.2 Check Database

```bash
cd apps/api
npm run db:studio
```

Opens Prisma Studio in browser. Check:
- `users` table → Should see your test user
- Email should match what you registered

### 5.3 Check Firebase Console

1. Go to Firebase Console → Authentication → Users
2. Should see registered users
3. Email should match database

---

## 🐛 Troubleshooting

### Backend won't start

**Error: Port 3000 already in use**
```bash
# Find and kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change PORT in .env:
PORT=3001
```

**Error: Cannot connect to database**
- Check Supabase project is active
- Verify DATABASE_URL in `.env`

---

### Mobile app can't connect to backend

**Error: Network request failed**

**If using physical device:**
- Make sure phone and computer are on same WiFi
- Use computer's IP address, not `localhost`
- Check firewall isn't blocking port 3000

**If using simulator/emulator:**
- iOS Simulator: `localhost` works
- Android Emulator: Use `10.0.2.2` instead of `localhost`

Update `.env`:
```bash
# For Android Emulator:
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

---

### Firebase errors

**Error: Firebase not initialized**
- Check `firebaseConfig` values in `src/config/firebase.ts`
- Verify all values match Firebase Console

**Error: Auth domain not authorized**
- Firebase Console → Authentication → Settings
- Add your domain to authorized domains

---

## 📋 Quick Checklist

Before testing, verify:

- [ ] Backend dependencies installed (`npm install` in `apps/api`)
- [ ] Backend `.env` has DATABASE_URL and FIREBASE_SERVICE_ACCOUNT
- [ ] Backend server starts (`npm run dev`)
- [ ] Backend responds to `/health` endpoint
- [ ] Mobile dependencies installed (`npm install` in `apps/mobile`)
- [ ] Mobile `.env` created with EXPO_PUBLIC_API_URL
- [ ] Firebase web app created in Firebase Console
- [ ] Firebase config values copied to `src/config/firebase.ts`
- [ ] Email/Password authentication enabled in Firebase
- [ ] Mobile app starts (`npm start`)

---

## 🎯 What to Do Right Now

1. **Open Terminal 1:**
   ```bash
   cd apps/api
   npm install
   npm run dev
   ```

2. **Open Terminal 2:**
   ```bash
   cd apps/mobile
   npm install
   ```

3. **Get Firebase config:**
   - Go to Firebase Console
   - Copy web app config values

4. **Create mobile `.env`:**
   - Create `apps/mobile/.env`
   - Add `EXPO_PUBLIC_API_URL` (use your IP address)

5. **Install Expo Firebase:**
   ```bash
   cd apps/mobile
   npx expo install firebase
   ```

6. **Create Firebase config file** (see Step 3.3 above)

7. **Update authService.ts** to use Expo Firebase

8. **Start mobile app:**
   ```bash
   npm start
   ```

9. **Test registration!**

---

## Need Help?

If you get stuck at any step:
1. Check the error message
2. Look at backend terminal logs
3. Check Firebase Console for errors
4. Verify all environment variables are set correctly
