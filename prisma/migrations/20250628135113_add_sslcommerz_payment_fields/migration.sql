-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentTransactionId" TEXT,
ADD COLUMN     "paymentValidationId" TEXT;
