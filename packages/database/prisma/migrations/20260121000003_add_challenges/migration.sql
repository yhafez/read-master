-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('OFFICIAL', 'COMMUNITY', 'PERSONAL', 'SEASONAL');

-- CreateEnum
CREATE TYPE "ChallengeGoalType" AS ENUM ('BOOKS_READ', 'PAGES_READ', 'TIME_READING', 'WORDS_READ', 'STREAK_DAYS', 'BOOKS_IN_GENRE', 'FLASHCARDS_CREATED', 'ASSESSMENTS_COMPLETED');

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "icon" VARCHAR(50),
    "badgeColor" VARCHAR(7),
    "type" "ChallengeType" NOT NULL,
    "goalType" "ChallengeGoalType" NOT NULL,
    "goalValue" INTEGER NOT NULL,
    "goalUnit" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "duration" INTEGER,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "badgeIcon" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "tier" "AchievementTier" NOT NULL DEFAULT 'COMMON',
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "goalValue" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_type_idx" ON "Challenge"("type");

-- CreateIndex
CREATE INDEX "Challenge_isOfficial_idx" ON "Challenge"("isOfficial");

-- CreateIndex
CREATE INDEX "Challenge_isActive_idx" ON "Challenge"("isActive");

-- CreateIndex
CREATE INDEX "Challenge_startDate_endDate_idx" ON "Challenge"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_userId_idx" ON "ChallengeParticipant"("userId");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_challengeId_idx" ON "ChallengeParticipant"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_challengeId_isCompleted_idx" ON "ChallengeParticipant"("challengeId", "isCompleted");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_challengeId_progress_idx" ON "ChallengeParticipant"("challengeId", "progress");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_userId_isCompleted_idx" ON "ChallengeParticipant"("userId", "isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipant_userId_challengeId_key" ON "ChallengeParticipant"("userId", "challengeId");

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
