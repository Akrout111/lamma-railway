-- Lamma — Initial PostgreSQL Migration
-- Created: 2026-06-24
-- Based on prisma/schema.prisma (Phase B)
-- Target: Supabase PostgreSQL with pgvector + pg_trgm extensions

-- ============================================
-- Extensions (must be enabled first)
-- ============================================
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- Enum types
-- ============================================
-- Note: Prisma generates enums as PostgreSQL types
-- We use String + Zod validation in the app instead,
-- so no actual enums are created here.

-- ============================================
-- User table
-- ============================================
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "name" JSONB NOT NULL,
    "bio" JSONB,
    "avatarUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" vector(1536),
    "membershipTier" TEXT NOT NULL DEFAULT 'NEWCOMER',
    "hostedCount" INTEGER NOT NULL DEFAULT 0,
    "attendedCount" INTEGER NOT NULL DEFAULT 0,
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- Create regular indexes
CREATE INDEX "User_membershipTier_idx" ON "User"("membershipTier");
CREATE INDEX "User_gender_idx" ON "User"("gender");

-- ============================================
-- Host table
-- ============================================
CREATE TABLE "Host" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" JSONB NOT NULL,
    "bio" JSONB NOT NULL,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "specialties" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "topicSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalGatherings" INTEGER NOT NULL DEFAULT 0,
    "totalAttendees" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseTimeHours" INTEGER NOT NULL DEFAULT 24,
    "instagram" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Host_userId_key" ON "Host"("userId");
CREATE UNIQUE INDEX "Host_handle_key" ON "Host"("handle");
CREATE INDEX "Host_isVerified_idx" ON "Host"("isVerified");

-- ============================================
-- Topic table
-- ============================================
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#B85C3E',
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");
CREATE INDEX "Topic_slug_idx" ON "Topic"("slug");

-- ============================================
-- Gathering table
-- ============================================
CREATE TABLE "Gathering" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "coverImageUrl" TEXT,
    "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isPrayerAware" BOOLEAN NOT NULL DEFAULT true,
    "venueName" JSONB NOT NULL,
    "venueAddress" JSONB NOT NULL,
    "venueLat" DOUBLE PRECISION NOT NULL,
    "venueLng" DOUBLE PRECISION NOT NULL,
    "venueNotes" JSONB,
    "format" TEXT NOT NULL DEFAULT 'MIXED',
    "capacityMin" INTEGER NOT NULL DEFAULT 5,
    "capacityMax" INTEGER NOT NULL DEFAULT 20,
    "priceKwd" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "applicationQuestions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "applicationsOpenAt" TIMESTAMP(3),
    "applicationsCloseAt" TIMESTAMP(3),
    "approvedAttendeesCount" INTEGER NOT NULL DEFAULT 0,
    "hostId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gathering_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Gathering_slug_key" ON "Gathering"("slug");
CREATE INDEX "Gathering_status_idx" ON "Gathering"("status");
CREATE INDEX "Gathering_startDate_idx" ON "Gathering"("startDate");
CREATE INDEX "Gathering_hostId_idx" ON "Gathering"("hostId");
CREATE INDEX "Gathering_topicId_idx" ON "Gathering"("topicId");

-- ============================================
-- Application table
-- ============================================
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gatheringId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Application_userId_gatheringId_key" ON "Application"("userId", "gatheringId");
CREATE INDEX "Application_status_idx" ON "Application"("status");
CREATE INDEX "Application_gatheringId_idx" ON "Application"("gatheringId");

-- ============================================
-- Membership table
-- ============================================
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'NEWCOMER',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Membership_userId_tier_idx" ON "Membership"("userId", "tier");

-- ============================================
-- Letter table
-- ============================================
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "subtitle" JSONB,
    "excerpt" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "coverImageUrl" TEXT,
    "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readTimeMinutes" INTEGER NOT NULL DEFAULT 5,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" JSONB,
    "metaDescription" JSONB,
    "topicId" TEXT NOT NULL,
    "authorHostId" TEXT NOT NULL,
    "gatheringId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Letter_slug_key" ON "Letter"("slug");
CREATE INDEX "Letter_publishedAt_idx" ON "Letter"("publishedAt");
CREATE INDEX "Letter_topicId_idx" ON "Letter"("topicId");

-- ============================================
-- Moment table
-- ============================================
CREATE TABLE "Moment" (
    "id" TEXT NOT NULL,
    "gatheringId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" JSONB NOT NULL,
    "capturedByUserId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Moment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Moment_gatheringId_idx" ON "Moment"("gatheringId");

-- ============================================
-- PrayerTime table
-- ============================================
CREATE TABLE "PrayerTime" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Kuwait',
    "date" DATE NOT NULL,
    "fajr" TIMESTAMP(3) NOT NULL,
    "sunrise" TIMESTAMP(3) NOT NULL,
    "dhuhr" TIMESTAMP(3) NOT NULL,
    "asr" TIMESTAMP(3) NOT NULL,
    "maghrib" TIMESTAMP(3) NOT NULL,
    "isha" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerTime_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrayerTime_city_date_key" ON "PrayerTime"("city", "date");
CREATE INDEX "PrayerTime_city_date_idx" ON "PrayerTime"("city", "date");

-- ============================================
-- AttendeeMatch table
-- ============================================
CREATE TABLE "AttendeeMatch" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "gatheringId" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "affinityTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendeeMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendeeMatch_userAId_userBId_gatheringId_key" ON "AttendeeMatch"("userAId", "userBId", "gatheringId");
CREATE INDEX "AttendeeMatch_userAId_idx" ON "AttendeeMatch"("userAId");
CREATE INDEX "AttendeeMatch_userBId_idx" ON "AttendeeMatch"("userBId");

-- ============================================
-- WaitlistEntry table
-- ============================================
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gatheringId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "note" TEXT,
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaitlistEntry_userId_gatheringId_key" ON "WaitlistEntry"("userId", "gatheringId");
CREATE INDEX "WaitlistEntry_gatheringId_position_idx" ON "WaitlistEntry"("gatheringId", "position");

-- ============================================
-- Review table
-- ============================================
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "gatheringId" TEXT,
    "hostId" TEXT,
    "rating" INTEGER NOT NULL,
    "body" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Review_gatheringId_idx" ON "Review"("gatheringId");
CREATE INDEX "Review_hostId_idx" ON "Review"("hostId");

-- ============================================
-- Notification table
-- ============================================
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- ============================================
-- Message table
-- ============================================
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_senderId_receiverId_idx" ON "Message"("senderId", "receiverId");
CREATE INDEX "Message_receiverId_readAt_idx" ON "Message"("receiverId", "readAt");

-- ============================================
-- Foreign Key Constraints
-- ============================================

-- Host → User
ALTER TABLE "Host" ADD CONSTRAINT "Host_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gathering → Host
ALTER TABLE "Gathering" ADD CONSTRAINT "Gathering_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Gathering → Topic
ALTER TABLE "Gathering" ADD CONSTRAINT "Gathering_topicId_fkey"
    FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Application → User
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Application → Gathering
ALTER TABLE "Application" ADD CONSTRAINT "Application_gatheringId_fkey"
    FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Membership → User
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Letter → Topic
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_topicId_fkey"
    FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Letter → Host (authorHost)
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_authorHostId_fkey"
    FOREIGN KEY ("authorHostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Letter → Gathering (optional)
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_gatheringId_fkey"
    FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Moment → Gathering
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_gatheringId_fkey"
    FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AttendeeMatch → User (userA)
ALTER TABLE "AttendeeMatch" ADD CONSTRAINT "AttendeeMatch_userAId_fkey"
    FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AttendeeMatch → User (userB)
ALTER TABLE "AttendeeMatch" ADD CONSTRAINT "AttendeeMatch_userBId_fkey"
    FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WaitlistEntry → User
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WaitlistEntry → Gathering
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_gatheringId_fkey"
    FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Review → User (reviewer)
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerUserId_fkey"
    FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Review → Gathering (optional)
ALTER TABLE "Review" ADD CONSTRAINT "Review_gatheringId_fkey"
    FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Notification → User
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message → User (sender)
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message → User (receiver)
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- End of migration
-- ============================================
