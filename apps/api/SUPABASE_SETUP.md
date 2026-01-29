# Supabase Database Setup

## Step 1: Create a Supabase Account and Project

1. Go to https://supabase.com
2. Click "Start your project" or "Sign up"
3. Sign up with GitHub, Google, or email
4. Click "New Project"
5. Fill in:
   - **Name**: SoCap (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine for development
6. Click "Create new project"
7. Wait 1-2 minutes for the project to be provisioned

## Step 2: Get Your Connection String

1. In your Supabase project dashboard, go to **Settings** (gear icon in sidebar)
2. Click **Database** in the settings menu
3. Scroll down to **Connection string** section
4. Select **URI** tab
5. Copy the connection string (it will look like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the database password you created in Step 1
7. Add `?sslmode=require` at the end if it's not already there

## Step 3: Update Your .env File

1. Open `apps/api/.env`
2. Replace the `DATABASE_URL` with your Supabase connection string:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
   ```

## Step 4: Run Migrations and Seed

Once your `.env` file is updated with the Supabase connection string:

```bash
cd apps/api
npx prisma migrate dev --name init
npm run db:seed
```

## Important Notes

- **Password**: Use the database password you set when creating the project (NOT your Supabase account password)
- **SSL Required**: Supabase requires SSL connections, so make sure `?sslmode=require` is in your connection string
- **Connection Pooling**: For production, consider using Supabase's connection pooler (port 6543) instead of direct connection (port 5432)

## Troubleshooting

- **Connection timeout**: Check your firewall/network settings
- **Authentication failed**: Verify you're using the database password, not your account password
- **SSL error**: Make sure `?sslmode=require` is in your connection string
