# 🚀 START HERE - Exact Steps to Follow

## ⚡ Quick Version (5 minutes)

1. **Start Backend**
   ```bash
   cd apps/api
   npm install
   npm run dev
   ```

2. **Setup Mobile**
   ```bash
   cd apps/mobile
   npm install
   npx expo install firebase
   ```

3. **Create `.env` file** in `apps/mobile/`:
   ```bash
   EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api
   ```

4. **Get Firebase config** from Firebase Console → Project Settings → Web app

5. **Update** `apps/mobile/src/config/firebase.ts` with your Firebase values

6. **Enable Email/Password** in Firebase Console → Authentication

7. **Start mobile app**: `npm start`

8. **Test registration!**

---

## 📋 Detailed Step-by-Step

### ✅ STEP 1: Backend Setup (Terminal 1)

```bash
cd apps/api
npm install
npm run dev
```

**Wait for:** `🚀 Server running on http://localhost:3000`

**Test:** Open http://localhost:3000/health → Should see `{"status":"ok"}`

✅ **Backend is ready!**

---

### ✅ STEP 2: Get Your IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" under WiFi adapter

**Write it down:** `192.168.1.77` (you'll need this)

---

### ✅ STEP 3: Mobile App Setup (Terminal 2)

```bash
cd apps/mobile
npm install
npx expo install firebase
```

---

### ✅ STEP 4: Create Mobile Environment File

Create file: `apps/mobile/.env`

**Content:**
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.77:3000/api
```

**Replace `YOUR_IP_ADDRESS`** with the IP you found in Step 2.

**Example:**
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

---

### ✅ STEP 5: Get Firebase Configuration

1. Open: https://console.firebase.google.com/
2. Select project: **my-soca-project**
3. Click **⚙️ Project Settings** (gear icon, top left)
4. Scroll to **Your apps** section
5. If no web app:
   - Click **Add app** → Select **Web** (`</>`)
   - Name: `SoCap Web`
   - Click **Register app**
6. Copy these 6 values from YOUR Firebase console:
   - `apiKey`: `AIzaSy...` (YOUR key - never commit this!)
   - `authDomain`: `your-project.firebaseapp.com`
   - `projectId`: `your-project-id`
   - `storageBucket`: `your-project.firebasestorage.app`
   - `messagingSenderId`: `your-sender-id`
   - `appId`: `your-app-id`
   
   ⚠️ **NEVER commit real API keys to Git!**

---

### ✅ STEP 6: Update Firebase Config File

Edit: `apps/mobile/src/config/firebase.ts`

**Replace the placeholder values** with what you copied:

```typescript
const firebaseConfig = {
  apiKey: "AIza...", // ← Paste your apiKey here
  authDomain: "my-soca-project.firebaseapp.com", // ← Your authDomain
  projectId: "my-soca-project", // ← Your projectId
  storageBucket: "my-soca-project.appspot.com", // ← Your storageBucket
  messagingSenderId: "123456789", // ← Your messagingSenderId
  appId: "1:123456789:web:abc", // ← Your appId
};
```

**Save the file.**

---

### ✅ STEP 7: Enable Email/Password Authentication

1. In Firebase Console, click **Authentication** (left sidebar)
2. Click **Get Started** (if first time)
3. Go to **Sign-in method** tab
4. Click **Email/Password**
5. Toggle **Enable** to **ON**
6. Click **Save**

✅ **Authentication is enabled!**

---

### ✅ STEP 8: Start Mobile App

```bash
# Terminal 2 (still in apps/mobile)
npm start
```

**Options:**
- Press `i` → Opens iOS simulator
- Press `a` → Opens Android emulator
- Scan QR code → Opens in Expo Go app on your phone

**Wait for app to load.**

---

### ✅ STEP 9: Test Registration

1. **App opens** → You should see **Login** screen
2. **Tap "Sign Up"** button (bottom of screen)
3. **Fill in the form:**
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
   - ✅ **Check** "I accept terms" checkbox
4. **Tap "Sign Up"** button

**Expected Result:**
- ✅ Account created
- ✅ Navigates to main app (Home screen)
- ✅ Backend terminal shows registration request
- ✅ No errors!

---

### ✅ STEP 10: Verify It Worked

**Check Backend Terminal:**
- Should see: `POST /api/auth/register 201`

**Check Database:**
```bash
cd apps/api
npm run db:studio
```
- Opens Prisma Studio
- Check `users` table → Should see your test user

**Check Firebase Console:**
- Firebase Console → Authentication → Users
- Should see `test@example.com`

---

## 🎉 Success!

If registration worked, you're all set! Now test login:

1. Sign out (if logged in)
2. Enter email: `test@example.com`
3. Enter password: `password123`
4. Tap "Sign In"
5. Should navigate to main app

---

## 🐛 Troubleshooting

### Backend won't start
- Check port 3000 is not in use
- Verify `.env` file exists in `apps/api/`

### Mobile can't connect to backend
- ✅ Check backend is running
- ✅ Verify IP address in `.env` is correct
- ✅ Make sure phone and computer on same WiFi
- ✅ Try `localhost` if using simulator: `EXPO_PUBLIC_API_URL=http://localhost:3000/api`

### Firebase errors
- ✅ Check all 6 config values are correct
- ✅ Verify Email/Password is enabled in Firebase Console
- ✅ Check Firebase project is active

### Registration fails
- Check backend terminal for error messages
- Check Firebase Console → Authentication → Users (might already exist)
- Try a different email address

---

## 📞 Need Help?

1. Check backend terminal logs
2. Check mobile app console (in Expo)
3. Check Firebase Console for errors
4. Verify all environment variables are set

---

## ✅ Checklist

Before testing, make sure:

- [ ] Backend running (`npm run dev` in `apps/api`)
- [ ] Backend responds to `/health`
- [ ] Mobile `.env` file created with correct IP
- [ ] Firebase config values updated in `src/config/firebase.ts`
- [ ] Email/Password enabled in Firebase Console
- [ ] Mobile app started (`npm start`)

**Ready? Start with Step 1!** 🚀
