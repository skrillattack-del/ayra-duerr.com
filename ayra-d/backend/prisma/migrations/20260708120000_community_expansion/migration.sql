-- CreateEnum
CREATE TYPE "ChannelPostingPolicy" AS ENUM ('EVERYONE', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'OFF_TOPIC', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REPLY', 'MENTION', 'SQUAD_INVITE', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'DIRECT_MESSAGE', 'ACHIEVEMENT', 'LEVEL_UP', 'ANNOUNCEMENT', 'MODERATION');

-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('MESSAGE', 'REPLY_RECEIVED', 'REACTION_RECEIVED', 'REACTION_GIVEN', 'WORKOUT_COMPLETED', 'PROGRESS_LOG', 'CHALLENGE_JOINED', 'SQUAD_JOINED', 'SQUAD_CREATED', 'FRIEND_ADDED', 'ACHIEVEMENT', 'STREAK_BONUS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "community_mute_reason" TEXT,
ADD COLUMN     "community_muted_by" TEXT,
ADD COLUMN     "community_muted_until" TIMESTAMP(3),
ADD COLUMN     "current_period_end" TIMESTAMP(3),
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "deleted_reason" TEXT,
ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pinned_at" TIMESTAMP(3),
ADD COLUMN     "pinned_by" TEXT;

-- AlterTable
ALTER TABLE "squad_members" ADD COLUMN     "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "posting_policy" "ChannelPostingPolicy" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "required_tier" "MembershipTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "squad_id" DROP NOT NULL,
ALTER COLUMN "created_by" DROP NOT NULL;

-- CreateTable
CREATE TABLE "message_reports" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "ref_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_active_date" TIMESTAMP(3),
    "messages_sent" INTEGER NOT NULL DEFAULT 0,
    "reactions_given" INTEGER NOT NULL DEFAULT 0,
    "reactions_received" INTEGER NOT NULL DEFAULT 0,
    "workouts_completed" INTEGER NOT NULL DEFAULT 0,
    "progress_logs" INTEGER NOT NULL DEFAULT 0,
    "challenges_joined" INTEGER NOT NULL DEFAULT 0,
    "squads_joined" INTEGER NOT NULL DEFAULT 0,
    "squads_created" INTEGER NOT NULL DEFAULT 0,
    "friends_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XpSource" NOT NULL,
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_reads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "peer_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_reports_status_created_at_idx" ON "message_reports"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "message_reports_message_id_reporter_id_key" ON "message_reports"("message_id", "reporter_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_key" ON "user_stats"("user_id");

-- CreateIndex
CREATE INDEX "user_stats_xp_idx" ON "user_stats"("xp" DESC);

-- CreateIndex
CREATE INDEX "xp_events_user_id_source_created_at_idx" ON "xp_events"("user_id", "source", "created_at");

-- CreateIndex
CREATE INDEX "xp_events_user_id_source_ref_id_idx" ON "xp_events"("user_id", "source", "ref_id");

-- CreateIndex
CREATE INDEX "xp_events_created_at_idx" ON "xp_events"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_reads_user_id_peer_id_key" ON "conversation_reads"("user_id", "peer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "messages_channel_id_is_pinned_idx" ON "messages"("channel_id", "is_pinned");

-- CreateIndex
CREATE UNIQUE INDEX "channels_slug_key" ON "channels"("slug");

-- CreateIndex
CREATE INDEX "channels_squad_id_sort_order_idx" ON "channels"("squad_id", "sort_order");

-- AddForeignKey
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

