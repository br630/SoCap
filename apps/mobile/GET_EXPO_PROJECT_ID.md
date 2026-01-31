# How to Get Your Expo Project ID

## Method 1: Check if you're logged into Expo

Run this command:
```bash
cd apps/mobile
npx expo whoami
```

If you're logged in, you'll see your username. Then:

1. Go to [https://expo.dev](https://expo.dev)
2. Sign in with the same account
3. Click "Create a project" or select an existing project
4. Copy the Project ID from the project settings

## Method 2: Create a new Expo project (if you don't have one)

1. Make sure you're in the mobile directory:
   ```bash
   cd apps/mobile
   ```

2. Login to Expo (if not already):
   ```bash
   npx expo login
   ```

3. Initialize/register your project:
   ```bash
   npx expo init
   ```
   OR if you want to keep your existing setup:
   ```bash
   npx expo register
   ```

4. The project ID will be shown in the output or in your `app.json` file

## Method 3: For Development (Expo Go) - Optional

If you're just testing with Expo Go, you can skip the project ID for now. However, **push notifications require a project ID**.

## Method 4: Quick Setup

1. Go to [https://expo.dev](https://expo.dev)
2. Sign up or log in
3. Click "Create a project"
4. Name it "SoCap" or "mobile"
5. Copy the Project ID (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
6. Add it to your `.env` file:

```env
EXPO_PUBLIC_PROJECT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

## After Getting Your Project ID

Add it to `apps/mobile/.env`:

```env
EXPO_PUBLIC_PROJECT_ID=your-project-id-here
```

Then restart your Expo development server.
