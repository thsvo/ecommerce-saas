import { NextApiRequest, NextApiResponse } from 'next';
const SSLCommerzPayment = require('sslcommerz');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId, validationId } = req.body;

    if (!transactionId || !validationId) {
      return res.status(400).json({ error: 'Transaction ID and Validation ID are required' });
    }

    // Initialize SSLCommerz
    const sslcz = new SSLCommerzPayment(
      process.env.SSLCOMMERZ_STORE_ID,
      process.env.SSLCOMMERZ_STORE_PASSWORD,
      process.env.SSLCOMMERZ_IS_LIVE === 'true'
    );

    // Validate the transaction
    const validation = await sslcz.validate({
      val_id: validationId
    });

    // Find the order with this transaction ID
    const order = await prisma.order.findFirst({
      where: { paymentTransactionId: transactionId }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      isValid: validation.status === 'VALID',
      transactionStatus: validation.status,
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total
      }
    });
  } catch (error) {
    console.error('Payment validation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
