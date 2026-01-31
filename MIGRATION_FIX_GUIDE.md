# How to Apply the DeviceToken Migration

## The Problem
The database advisory lock is preventing Prisma from applying the migration. This often happens with Supabase connection poolers.

## Solution Options

### Option 1: Use Direct Connection (Recommended)

1. **Get your direct connection string from Supabase:**
   - In the Supabase dashboard, go to "Connect to your project"
   - Select "Type: URI"
   - Select "Source: Primary Database"  
   - Select "Method: Direct connection" (NOT Session Pooler)
   - Copy the connection string

2. **Update your `.env` file temporarily:**
   - Open `apps/api/.env`
   - Replace `DATABASE_URL` with the direct connection string
   - Make sure to replace `[YOUR-PASSWORD]` with your actual database password

3. **Run the migration:**
   ```bash
   cd apps/api
   npm run db:migrate
   ```

4. **After migration succeeds, you can switch back to pooler if needed**

### Option 2: Use `prisma db push` (Quick Workaround)

This syncs your schema without creating migration records:

```bash
cd apps/api
npx prisma db push
```

**Note:** This works but doesn't track the migration in Prisma's migration history. The migration file we created will still be there for reference.

### Option 3: Wait and Retry

Sometimes the lock clears after a few minutes:

```bash
cd apps/api
npm run db:migrate
```

### Option 4: Apply Migration via Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of: `apps/api/prisma/migrations/20260130230301_add_device_token/migration.sql`
3. Paste and run it in the SQL Editor
4. Then mark it as applied in Prisma:
   ```bash
   cd apps/api
   npx prisma migrate resolve --applied 20260130230301_add_device_token
   ```

## Recommended: Try Option 1 First

The direct connection usually resolves the lock issue. After the migration succeeds, you can switch back to your pooler connection if you prefer.
