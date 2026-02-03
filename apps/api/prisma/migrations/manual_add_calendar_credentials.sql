-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'APPLE', 'OUTLOOK');

-- CreateTable
CREATE TABLE "calendar_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'GOOGLE',
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "primaryCalendarId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_credentials_userId_key" ON "calendar_credentials"("userId");

-- CreateIndex
CREATE INDEX "calendar_credentials_userId_idx" ON "calendar_credentials"("userId");

-- CreateIndex
CREATE INDEX "calendar_credentials_provider_idx" ON "calendar_credentials"("provider");

-- AddForeignKey
ALTER TABLE "calendar_credentials" ADD CONSTRAINT "calendar_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
