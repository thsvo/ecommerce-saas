import { NextApiRequest, NextApiResponse } from 'next';
const SSLCommerzPayment = require('sslcommerz');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tran_id, val_id, value_a: orderId, status } = req.body;

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
      // Update order based on payment status
      if (status === 'VALID') {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            paymentTransactionId: tran_id,
            paymentValidationId: val_id,
            paidAt: new Date()
          }
        });
      } else {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'FAILED'
          }
        });
      }

      res.status(200).json({ message: 'IPN processed successfully' });
    } else {
      res.status(400).json({ error: 'Invalid transaction' });
    }
  } catch (error) {
    console.error('SSLCommerz IPN handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
