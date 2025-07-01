-- CreateEnum
CREATE TYPE "SMSStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "sms_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipients" TEXT[],
    "status" "SMSStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "apiProvider" TEXT,
    "apiResponse" JSONB,
    "failedNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_campaign_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_campaign_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_logs" ADD CONSTRAINT "sms_campaign_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "sms_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_logs" ADD CONSTRAINT "sms_campaign_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
