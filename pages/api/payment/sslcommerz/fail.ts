import { NextApiRequest, NextApiResponse } from 'next';
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tran_id, value_a: orderId } = req.body;

    if (orderId) {
      // Update order status to failed
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED'
        }
      });
    }

    // Redirect to failure page
    res.redirect(`${process.env.NEXTAUTH_URL}/payment/failed?orderId=${orderId}&transactionId=${tran_id}&reason=payment_failed`);
  } catch (error) {
    console.error('SSLCommerz fail handler error:', error);
    res.redirect(`${process.env.NEXTAUTH_URL}/payment/failed?reason=server_error`);
  }
}
