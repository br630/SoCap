# Android Emulator Quick Start Guide

## Step 1: Install Android Studio

1. **Download Android Studio**
   - Go to: https://developer.android.com/studio
   - Click "Download Android Studio"
   - The file will be named something like `android-studio-2023.x.x-windows.exe`

2. **Run the Installer**
   - Double-click the downloaded file
   - Click "Next" through the setup wizard
   - **Important**: Make sure these components are checked:
     - ✅ Android SDK
     - ✅ Android SDK Platform
     - ✅ Android Virtual Device
   - Choose installation location (default is fine)
   - Click "Install" and wait for completion

3. **First Launch Setup**
   - When Android Studio opens for the first time:
     - Choose "Standard" installation type
     - Accept the license agreements
     - Wait for SDK components to download (this may take 10-20 minutes)
     - Click "Finish" when done

## Step 2: Create an Android Virtual Device (AVD)

1. **Open Device Manager**
   - In Android Studio, click **Tools** → **Device Manager** (or **AVD Manager**)
   - Or click the device icon in the toolbar

2. **Create New Device**
   - Click **Create Device** button
   - Select a device:
     - Recommended: **Pixel 5** or **Pixel 6**
     - Click **Next**

3. **Select System Image**
   - Choose a system image (Android version):
     - Recommended: **API 33 (Android 13)** or **API 34 (Android 14)**
     - If you see "Download" next to it, click it and wait for download
   - Click **Next**

4. **Configure AVD**
   - Name: Keep default or name it (e.g., "Pixel_5_API_33")
   - Verify settings look good
   - Click **Finish**

## Step 3: Start the Emulator

1. **In Device Manager**
   - Find your newly created AVD
   - Click the **Play** button (▶️) next to it
   - Wait for emulator to boot (2-5 minutes first time)

2. **Verify It's Running**
   - You should see the Android home screen
   - The emulator window should be open

## Step 4: Test with Expo

1. **Make sure API server is running:**
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Start Expo:**
   ```bash
   cd apps/mobile
   npx expo start
   ```

3. **Open on Android:**
   - Press `a` in the Expo terminal
   - Or scan the QR code with Expo Go (if using physical device)

## Troubleshooting

### "adb not found" error
- Add Android SDK platform-tools to PATH:
  - Usually at: `C:\Users\<YourUsername>\AppData\Local\Android\Sdk\platform-tools`
  - Or find it in Android Studio: **Tools** → **SDK Manager** → **SDK Tools** tab

### Emulator is slow
- Enable hardware acceleration:
  - In AVD settings, check "Use Host GPU"
  - Allocate more RAM (2-4GB recommended)

### Can't connect to API
- Verify API is running: Open `http://localhost:3000/health` in browser
- The emulator uses `10.0.2.2` automatically (already configured)

### Expo can't find emulator
- Make sure emulator is fully booted (home screen visible)
- Try: `adb devices` in terminal (should show your emulator)
- Restart both Expo and the emulator

## Quick Commands

```bash
# Check if emulator is running
adb devices

# List available AVDs
emulator -list-avds

# Start specific AVD from command line
emulator -avd <AVD_NAME>
```
