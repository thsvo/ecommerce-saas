/*
  Warnings:

  - You are about to drop the column `email` on the `super_admins` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `super_admins` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- DropIndex
DROP INDEX "super_admins_email_key";

-- AlterTable
ALTER TABLE "super_admins" DROP COLUMN "email",
DROP COLUMN "name";
