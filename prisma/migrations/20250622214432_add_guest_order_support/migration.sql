-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;
