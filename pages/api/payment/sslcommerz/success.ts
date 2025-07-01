import { NextApiRequest, NextApiResponse } from 'next';
const SSLCommerzPayment = require('sslcommerz-lts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tran_id, val_id, value_a: orderId, value_b: customerName } = req.body;

    if (!tran_id || !val_id || !orderId) {
      return res.status(400).json({ error: 'Missing transaction data' });
    }

    // Initialize SSLCommerz
    const sslcz = new SSLCommerzPayment(
      process.env.SSLCOMMERZ_STORE_ID,
      process.env.SSLCOMMERZ_STORE_PASSWORD,
      process.env.SSLCOMMERZ_IS_LIVE === 'true'
    );

    // Validate the transaction
    const validation = await sslcz.validate({
      val_id: val_id
    });

    if (validation.status === 'VALID') {
      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paymentTransactionId: tran_id,
          paymentValidationId: val_id,
          paidAt: new Date()
        }
      });

      // Get customer name for thank you page
      const finalCustomerName = customerName || updatedOrder.customerName || 'Customer';

      // Redirect to thank you page
      res.redirect(`${process.env.NEXTAUTH_URL}/thank-you?orderId=${orderId}&transactionId=${tran_id}&name=${encodeURIComponent(finalCustomerName)}&payment=success`);
    } else {
      // Update order status to failed
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED'
        }
      });

      res.redirect(`${process.env.NEXTAUTH_URL}/payment/failed?orderId=${orderId}&reason=validation_failed`);
    }
  } catch (error) {
    console.error('SSLCommerz success handler error:', error);
    res.redirect(`${process.env.NEXTAUTH_URL}/payment/failed?reason=server_error`);
  }
}
