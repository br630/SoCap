# Fix Supabase Connection Error

## Error
```
FATAL: Tenant or user not found
```

This error means Supabase cannot authenticate your database connection.

## Most Likely Causes

### 1. Supabase Project Paused (Most Common)
Free tier projects pause after 1 week of inactivity.

**Fix:**
1. Go to https://supabase.com/dashboard
2. Select your "SoCap" project
3. If paused, click "Resume Project"
4. Wait 1-2 minutes for it to start
5. Try again

### 2. Wrong Database Password
The password in your connection string may be incorrect.

**Fix:**
1. Go to Supabase Dashboard → Settings → Database
2. Click "Reset Database Password" or check current password
3. Update `apps/api/.env` with the correct password:
   ```
   DATABASE_URL="postgresql://postgres.xfyiolpjcncsqkgnhtii:YOUR_NEW_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
   ```
4. Restart the API server

### 3. Wrong Connection String Format
Ensure you're using the correct format:
- **Pooler connection** (port 6543): For application use
- **Direct connection** (port 5432): For migrations

**Current format:**
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

## How to Get the Correct Connection String

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **URI** tab
6. Copy the connection string
7. Replace `[YOUR-PASSWORD]` with your actual database password
8. Update `apps/api/.env`

## After Fixing

1. Restart the API server:
   ```bash
   cd apps/api
   npm run dev
   ```

2. Test the connection:
   ```bash
   npx prisma db pull
   ```

3. If successful, try registering again in the app
