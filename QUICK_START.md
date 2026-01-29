# Quick Start Guide - Get Running in 5 Minutes

## 🚀 Step 1: Start Backend (2 minutes)

```bash
# Terminal 1
cd apps/api
npm install
npm run dev
```

**✅ Success:** You should see:
```
🚀 Server running on http://localhost:3000
```

**Test:** Open http://localhost:3000/health in browser → Should see `{"status":"ok"}`

---

## 📱 Step 2: Setup Mobile App (3 minutes)

### 2.1 Install Dependencies

```bash
# Terminal 2
cd apps/mobile
npm install
npx expo install firebase
```

### 2.2 Get Your Computer's IP Address

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" (e.g., 192.168.1.100)
```

**Mac/Linux:**
```bash
ifconfig
# Look for "inet" under your WiFi adapter
```

### 2.3 Create Environment File

Create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000/api
```

**Example:**
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

### 2.4 Get Firebase Config

1. Go to: https://console.firebase.google.com/
2. Select project: **my-soca-project**
3. Click **⚙️ Project Settings**
4. Scroll to **Your apps** → Click **Web** icon (`</>`)
5. Copy the config values

### 2.5 Update Firebase Config

Edit `apps/mobile/src/config/firebase.ts`:

Replace the placeholder values with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "AIza...", // Your actual API key
  authDomain: "my-soca-project.firebaseapp.com",
  projectId: "my-soca-project",
  storageBucket: "my-soca-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

### 2.6 Enable Email/Password Auth

1. Firebase Console → **Authentication**
2. Click **Get Started**
3. Go to **Sign-in method** tab
4. Click **Email/Password**
5. Toggle **Enable** → **Save**

---

## 🎯 Step 3: Start Mobile App

```bash
# Terminal 2 (still in apps/mobile)
npm start
```

**Then:**
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Or scan QR code with Expo Go app

---

## ✅ Step 4: Test Registration

1. App opens → Tap **"Sign Up"**
2. Fill form:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm: `password123`
   - ✅ Check terms
3. Tap **"Sign Up"**

**Expected:** Account created, navigates to main app! 🎉

---

## 🐛 Common Issues

### "Network request failed"
- ✅ Check backend is running (`npm run dev` in `apps/api`)
- ✅ Verify IP address in `.env` matches your computer's IP
- ✅ Make sure phone and computer are on same WiFi

### "Firebase not initialized"
- ✅ Check `firebaseConfig` values in `src/config/firebase.ts`
- ✅ Verify all values match Firebase Console

### "Email/Password not enabled"
- ✅ Go to Firebase Console → Authentication → Sign-in method
- ✅ Enable Email/Password provider

---

## 📝 What's Next?

Once registration works:
1. Test login flow
2. Check user in database: `npm run db:studio` in `apps/api`
3. Check user in Firebase Console → Authentication → Users
4. Start building your app features!

---

## Need Help?

Check `STEP_BY_STEP_SETUP.md` for detailed instructions.
