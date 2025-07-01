/*
  Warnings:

  - A unique constraint covering the columns `[name,createdBy]` on the table `categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "categories_name_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "createdBy" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_createdBy_key" ON "categories"("name", "createdBy");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
