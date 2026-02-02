# Fix Android Emulator Graphics Crash

The emulator crashed due to a graphics driver issue. Here are solutions, from quickest to most thorough:

## Quick Fix: Enable Software Rendering

1. **Close the crash dialog** (click "Don't send" or close it)

2. **Open Extended Controls:**
   - In the emulator window, click the **three dots (⋯)** button on the right side
   - Or press `Ctrl + Shift + A` (Windows)

3. **Go to Settings:**
   - Click **Settings** in the left menu
   - Click the **Advanced** tab

4. **Change Graphics Renderer:**
   - Find "OpenGL ES renderer (requires restart)"
   - Change it from "Automatic" or "Hardware" to **"Swiftshader"**
   - Click **Save**

5. **Restart the emulator:**
   - Close the emulator completely
   - Start it again from Device Manager

## Alternative: Update Graphics Drivers

1. **Identify your graphics card:**
   - Press `Win + X` → **Device Manager**
   - Expand **Display adapters**
   - Note your graphics card (NVIDIA, AMD, Intel, etc.)

2. **Download latest drivers:**
   - **NVIDIA:** https://www.nvidia.com/Download/index.aspx
   - **AMD:** https://www.amd.com/en/support
   - **Intel:** https://www.intel.com/content/www/us/en/download-center/home.html

3. **Install the drivers** and restart your computer

4. **Try the emulator again**

## Alternative: Create AVD with Different Settings

If the above doesn't work, create a new AVD with safer settings:

1. **In Device Manager**, click **Create Device**

2. **Select a device** (Pixel 5 or Pixel 6)

3. **Select System Image:**
   - Choose **API 33** or **API 34** (more stable than 36)
   - Make sure it says "Google Play" (not "Google APIs")

4. **Before clicking Finish, click "Show Advanced Settings"**

5. **Graphics:**
   - Change "Graphics" from "Automatic" to **"Software - GLES 2.0"**
   - This uses software rendering from the start

6. **RAM:**
   - Set to **2048 MB** (2GB) - don't go too high

7. **Click Finish** and try starting it

## Check System Requirements

Make sure your system meets requirements:
- **RAM:** At least 8GB (16GB recommended)
- **Disk Space:** At least 10GB free
- **Virtualization:** Enabled in BIOS (Intel VT-x or AMD-V)

## If Nothing Works

You can also test using:
- **Physical Android device** (via USB debugging)
- **Expo Go** on a physical device
- **Web version** of your app (if supported)

Let me know which solution works for you!
