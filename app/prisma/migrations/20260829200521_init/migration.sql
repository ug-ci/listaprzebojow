-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('WAITING_ROOM', 'CHART', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EditionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FROZEN', 'BROADCASTING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('NEW', 'UP', 'DOWN', 'SAME', 'REENTRY');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'MUSIC_EDITOR', 'PRESENTER');

-- CreateTable
CREATE TABLE "ChartEdition" (
    "id" TEXT NOT NULL,
    "editionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "votingStartsAt" TIMESTAMP(3) NOT NULL,
    "votingEndsAt" TIMESTAMP(3) NOT NULL,
    "status" "EditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "genre" TEXT,
    "coverImageUrl" TEXT,
    "status" "TrackStatus" NOT NULL DEFAULT 'WAITING_ROOM',
    "durationSeconds" INTEGER NOT NULL DEFAULT 210,
    "totalWeeksOnChart" INTEGER NOT NULL DEFAULT 0,
    "peakPosition" INTEGER,
    "bpm" INTEGER,
    "audioKey" TEXT DEFAULT 'synth_chill',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartEntry" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "position" INTEGER,
    "previousPosition" INTEGER,
    "trend" "TrendDirection" NOT NULL DEFAULT 'NEW',
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "weeksOnChart" INTEGER NOT NULL DEFAULT 1,
    "isInWaitingRoom" BOOLEAN NOT NULL DEFAULT false,
    "tag" TEXT,

    CONSTRAINT "ChartEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voter" (
    "id" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "email" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastVotedAt" TIMESTAMP(3) NOT NULL,
    "nextEligibleVoteAt" TIMESTAMP(3) NOT NULL,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "fingerprintHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'MUSIC_EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChartEdition_editionNumber_key" ON "ChartEdition"("editionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ChartEntry_editionId_trackId_key" ON "ChartEntry"("editionId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "Voter_voterHash_key" ON "Voter"("voterHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "ChartEntry" ADD CONSTRAINT "ChartEntry_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "ChartEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartEntry" ADD CONSTRAINT "ChartEntry_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "ChartEdition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
