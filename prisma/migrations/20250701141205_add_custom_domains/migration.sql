/*
  Warnings:

  - You are about to drop the column `customDomain` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFYING', 'VERIFIED', 'FAILED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DomainVerificationMethod" AS ENUM ('DNS_TXT', 'DNS_CNAME', 'FILE_UPLOAD');

-- DropIndex
DROP INDEX "users_customDomain_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "customDomain";

-- CreateTable
CREATE TABLE "custom_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "verificationMethod" "DomainVerificationMethod" NOT NULL DEFAULT 'DNS_TXT',
    "verificationToken" TEXT NOT NULL,
    "dnsRecords" JSONB,
    "lastVerified" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "ssl" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_domain_key" ON "custom_domains"("domain");

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
