-- DropForeignKey
ALTER TABLE "sms_campaign_logs" DROP CONSTRAINT "sms_campaign_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "sms_campaigns" DROP CONSTRAINT "sms_campaigns_createdBy_fkey";

-- AlterTable
ALTER TABLE "sms_campaign_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sms_campaigns" ALTER COLUMN "createdBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_logs" ADD CONSTRAINT "sms_campaign_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
