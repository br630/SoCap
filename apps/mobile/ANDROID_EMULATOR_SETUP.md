# Android Emulator Setup Guide

This guide will help you set up and use the Android emulator for testing the SoCap mobile app.

## Prerequisites

1. **Android Studio** - Download from [developer.android.com/studio](https://developer.android.com/studio)
2. **Android SDK** - Installed with Android Studio
3. **Java Development Kit (JDK)** - Version 11 or higher

## Setup Steps

### 1. Install Android Studio

1. Download and install Android Studio
2. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

### 2. Create an Android Virtual Device (AVD)

1. Open Android Studio
2. Click **Tools** → **Device Manager** (or **AVD Manager**)
3. Click **Create Device**
4. Select a device definition (e.g., **Pixel 5**)
5. Click **Next**
6. Select a system image (e.g., **API 33** or **API 34** - Android 13/14)
   - If you don't have one, click **Download** next to the system image
7. Click **Next**
8. Review the configuration and click **Finish**

### 3. Start the Emulator

1. In Android Studio's Device Manager, click the **Play** button next to your AVD
2. Wait for the emulator to boot (this may take a few minutes the first time)

Alternatively, you can start it from the command line:
```bash
emulator -avd <AVD_NAME>
```

To list available AVDs:
```bash
emulator -list-avds
```

### 4. Configure API Connection

The app is already configured to use `10.0.2.2` for Android emulator, which maps to your host machine's `localhost`.

**Important**: Make sure your API server is running on `localhost:3000`:
```bash
cd apps/api
npm run dev
```

The emulator will automatically connect to `http://10.0.2.2:3000/api`.

### 5. Run the Expo App

1. Make sure your API server is running (`npm run dev` in `apps/api`)
2. Start Expo:
```bash
cd apps/mobile
npx expo start
```

3. Press `a` to open on Android emulator, or scan the QR code if using Expo Go

## Troubleshooting

### Emulator won't start
- Make sure **Hyper-V** is enabled (Windows) or **Intel HAXM** is installed
- Check that virtualization is enabled in your BIOS
- Try creating a new AVD with different settings

### Can't connect to API server
- Verify the API server is running: `http://localhost:3000/health`
- Check that the emulator is using `10.0.2.2` (this is automatic)
- Try restarting both the emulator and the API server

### Expo can't find the emulator
- Make sure the emulator is fully booted (wait for the home screen)
- Check that `adb` is in your PATH:
  ```bash
  adb devices
  ```
- If `adb` is not found, add Android SDK platform-tools to your PATH:
  - Windows: `C:\Users\<YourUsername>\AppData\Local\Android\Sdk\platform-tools`

### Slow performance
- Enable hardware acceleration in AVD settings
- Allocate more RAM to the emulator (recommended: 2-4GB)
- Use a system image with Google Play (more optimized)

## Testing Tips

1. **Hot Reload**: Changes to your code will automatically reload in the emulator
2. **Developer Menu**: Press `Ctrl+M` (Windows) or `Cmd+M` (Mac) to open the developer menu
3. **Logs**: View logs in the terminal where you ran `expo start`, or use:
   ```bash
   npx expo start --android
   ```

## Next Steps

Once the emulator is running and connected:
1. Test the registration flow
2. Verify API connectivity
3. Test all app features

## Notes

- The Android emulator uses `10.0.2.2` to access your host machine's `localhost`
- iOS simulator can use `localhost` directly
- Physical devices need your computer's IP address (e.g., `192.168.1.77:3000`)
