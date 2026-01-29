# Database Setup Guide

## Option 1: Using Docker (Recommended - Easiest)

If you have Docker installed, you can quickly start a PostgreSQL database:

1. Create a `docker-compose.yml` file in the project root (or use the one provided)
2. Run: `docker-compose up -d`
3. The database will be available at `localhost:5432`

## Option 2: Local PostgreSQL Installation

### Windows Installation:

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the installer from EnterpriseDB
   - Run the installer

2. **During Installation:**
   - Remember the password you set for the `postgres` user
   - Default port: `5432`
   - Default username: `postgres`

3. **Update `.env` file:**
   - Open `apps/api/.env`
   - Update the `DATABASE_URL` with your actual password:
     ```
     DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/socap_db?schema=public"
     ```

4. **Create the Database:**
   - Open pgAdmin or use psql command line
   - Create a database named `socap_db`:
     ```sql
     CREATE DATABASE socap_db;
     ```

5. **Start PostgreSQL Service:**
   - Open Services (Win + R, type `services.msc`)
   - Find "postgresql-x64-XX" service
   - Right-click and select "Start"

## Option 3: Cloud Database (Free Options)

### Using Supabase (Free Tier):
1. Sign up at https://supabase.com
2. Create a new project
3. Copy the connection string from Project Settings > Database
4. Update `.env` with the connection string

### Using Neon (Free Tier):
1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Update `.env` with the connection string

## After Database is Running

Once your database is set up and running:

1. **Run migrations:**
   ```bash
   cd apps/api
   npx prisma migrate dev --name init
   ```

2. **Seed the database:**
   ```bash
   npm run db:seed
   ```

3. **Verify with Prisma Studio:**
   ```bash
   npm run db:studio
   ```

## Troubleshooting

- **Connection refused:** Make sure PostgreSQL service is running
- **Authentication failed:** Check your username and password in `.env`
- **Database doesn't exist:** Create it manually or let Prisma create it (if permissions allow)
