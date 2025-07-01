/*
  Warnings:

  - A unique constraint covering the columns `[subdomain]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "subdomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_subdomain_key" ON "users"("subdomain");
