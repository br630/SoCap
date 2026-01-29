# Supabase Connection Troubleshooting

## Common Issues

### 1. Connection String Format

Make sure your connection string includes:
- `?sslmode=require` at the end (required for Supabase)
- URL-encoded password (special characters like `@` should be `%40`)

**Correct format:**
```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

### 2. Password Encoding

If your password contains special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`

### 3. Verify Connection String in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Settings → Database
3. Scroll to "Connection string"
4. Select "URI" tab
5. Copy the exact string (it should already have the password placeholder)
6. Replace `[YOUR-PASSWORD]` with your actual password
7. Make sure `?sslmode=require` is at the end

### 4. Try Connection Pooler (Alternative)

If direct connection doesn't work, try Supabase's connection pooler:

1. In Supabase Dashboard → Settings → Database
2. Find "Connection pooling" section
3. Use the "Session" or "Transaction" mode connection string
4. It will use port `6543` instead of `5432`
5. Format: `postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require`

### 5. Check Project Status

- Make sure your Supabase project is fully provisioned (can take 1-2 minutes)
- Check that the project status shows "Active" in the dashboard

### 6. Network/Firewall Issues

- Some networks/firewalls block port 5432
- Try using the connection pooler (port 6543) instead
- Check if you're behind a corporate firewall

### 7. Test Connection

You can test the connection using psql (if installed):
```bash
psql "postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

Or use a PostgreSQL client like pgAdmin or DBeaver to test the connection.
