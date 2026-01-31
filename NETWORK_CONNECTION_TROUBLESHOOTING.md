# Network Connection Troubleshooting

## Problem: Phone Can't Connect to API Server

If your phone shows "localhost is refusing to connect" or connection errors, follow these steps:

## ✅ Step 1: Server Configuration (FIXED)

The server now listens on `0.0.0.0` instead of just `localhost`, allowing network connections.

**Restart your API server:**
```bash
cd apps/api
npm run dev
```

## ✅ Step 2: Verify Your IP Address

Your phone needs to connect to your computer's IP address, not `localhost`.

**Your current IP:** `192.168.1.77` (Wi-Fi adapter)

**Your `.env` is already set correctly:**
```
EXPO_PUBLIC_API_URL=http://192.168.1.77:3000/api
```

## ✅ Step 3: Check Windows Firewall

Windows Firewall might be blocking incoming connections on port 3000.

### Option A: Allow Through Firewall (Recommended)
1. Open **Windows Defender Firewall**
2. Click **Advanced settings**
3. Click **Inbound Rules** → **New Rule**
4. Select **Port** → **Next**
5. Select **TCP** and enter port **3000** → **Next**
6. Select **Allow the connection** → **Next**
7. Check all profiles (Domain, Private, Public) → **Next**
8. Name it "SoCap API Server" → **Finish**

### Option B: Temporarily Disable Firewall (Testing Only)
⚠️ Only for testing! Re-enable after.

1. Open **Windows Defender Firewall**
2. Click **Turn Windows Defender Firewall on or off**
3. Turn off for **Private networks** (temporarily)
4. Test your connection
5. **Re-enable immediately after testing**

## ✅ Step 4: Verify Same Network

**Both devices must be on the same Wi-Fi network:**
- Your phone: Connected to Wi-Fi
- Your computer: Connected to the same Wi-Fi network
- Check: Both should have IPs starting with `192.168.1.x`

## ✅ Step 5: Test Connection

### From Your Phone's Browser:
1. Open a browser on your phone
2. Go to: `http://192.168.1.77:3000/health`
3. You should see: `{"status":"ok","timestamp":"..."}`

### From Your Computer:
```bash
# Test if server is accessible
curl http://192.168.1.77:3000/health
# or open in browser: http://localhost:3000/health
```

## ✅ Step 6: Check API Server is Running

Make sure your API server is actually running:

```bash
cd apps/api
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3000
🌐 Network access: http://192.168.1.77:3000
```

## Common Issues

### "Connection refused"
- ✅ Server not running → Start it with `npm run dev`
- ✅ Firewall blocking → Allow port 3000
- ✅ Wrong IP address → Check with `ipconfig`

### "Network unreachable"
- ✅ Different networks → Connect both to same Wi-Fi
- ✅ IP address changed → Update `.env` with new IP

### "Timeout"
- ✅ Firewall blocking → Allow port 3000
- ✅ Server crashed → Check terminal for errors

## Quick Test Checklist

- [ ] API server is running (`npm run dev`)
- [ ] Server shows "Network access: http://192.168.1.77:3000"
- [ ] Phone and computer on same Wi-Fi
- [ ] Windows Firewall allows port 3000
- [ ] Can access `http://192.168.1.77:3000/health` from phone browser
- [ ] `.env` has `EXPO_PUBLIC_API_URL=http://192.168.1.77:3000/api`

## If IP Address Changes

If your computer gets a new IP address:

1. **Find new IP:**
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" under "Wireless LAN adapter Wi-Fi"

2. **Update `.env`:**
   ```
   EXPO_PUBLIC_API_URL=http://NEW_IP:3000/api
   ```

3. **Restart Expo:**
   ```bash
   cd apps/mobile
   npx expo start --clear
   ```
