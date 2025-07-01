import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const SSLCommerzPayment = require('sslcommerz-lts');
const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== SSLCommerz Init Handler Called ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== SSLCommerz Payment Init Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      orderId, 
      amount, 
      customerInfo, 
      shippingAddress,
      orderItems 
    } = req.body;

    // Validate environment variables first
    console.log('Environment variables check:', {
      SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID ? `Set (${process.env.SSLCOMMERZ_STORE_ID})` : 'Missing',
      SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD ? 'Set' : 'Missing',
      SSLCOMMERZ_IS_LIVE: process.env.SSLCOMMERZ_IS_LIVE,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL
    });

    if (!process.env.SSLCOMMERZ_STORE_ID || !process.env.SSLCOMMERZ_STORE_PASSWORD) {
      console.error('SSLCommerz credentials missing in environment variables');
      return res.status(500).json({ 
        error: 'SSLCommerz credentials not configured properly' 
      });
    }

    if (!orderId || !amount || !customerInfo || !shippingAddress) {
      console.error('Missing required fields:', { orderId, amount, customerInfo, shippingAddress });
      return res.status(400).json({ 
        error: 'Missing required fields: orderId, amount, customerInfo, shippingAddress' 
      });
    }

    // Verify the order exists
    console.log('Looking for order with ID:', orderId);
    let order;
    try {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        }
      });
      console.log('Order found:', order ? 'Yes' : 'No');
      if (order) {
        console.log('Order details:', {
          id: order.id,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus
        });
      }
    } catch (dbError) {
      console.error('Database error when finding order:', dbError);
      return res.status(500).json({ 
        error: 'Database error when finding order',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Parse shipping address if it's a string
    let parsedShippingAddress;
    try {
      parsedShippingAddress = typeof shippingAddress === 'string' 
        ? JSON.parse(shippingAddress) 
        : shippingAddress;
      console.log('Parsed shipping address:', parsedShippingAddress);
    } catch (parseError) {
      console.error('Error parsing shipping address:', parseError);
      return res.status(400).json({ 
        error: 'Invalid shipping address format',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      });
    }

    // Generate unique transaction ID
    const transactionId = `TXN_${orderId}_${Date.now()}`;
    console.log('Generated transaction ID:', transactionId);

    // Payment data
    const data = {
      total_amount: parseFloat(amount).toFixed(2),
      currency: 'BDT',
      tran_id: transactionId,
      success_url: `${process.env.NEXTAUTH_URL}/api/payment/sslcommerz/success`,
      fail_url: `${process.env.NEXTAUTH_URL}/api/payment/sslcommerz/fail`,
      cancel_url: `${process.env.NEXTAUTH_URL}/api/payment/sslcommerz/cancel`,
      ipn_url: `${process.env.NEXTAUTH_URL}/api/payment/sslcommerz/ipn`,
      shipping_method: 'Courier',
      product_name: `Order #${orderId}`,
      product_category: 'General',
      product_profile: 'general',
      cus_name: customerInfo.name || parsedShippingAddress.fullName || 'Customer',
      cus_email: customerInfo.email || 'customer@example.com',
      cus_add1: parsedShippingAddress.address || 'Customer Address',
      cus_add2: '',
      cus_city: parsedShippingAddress.city || 'Dhaka',
      cus_state: parsedShippingAddress.state || 'Dhaka',
      cus_postcode: parsedShippingAddress.zipCode || '1000',
      cus_country: parsedShippingAddress.country || 'Bangladesh',
      cus_phone: customerInfo.phone || parsedShippingAddress.phone || '01700000000',
      cus_fax: '',
      ship_name: parsedShippingAddress.fullName || customerInfo.name || 'Customer',
      ship_add1: parsedShippingAddress.address || 'Customer Address',
      ship_add2: '',
      ship_city: parsedShippingAddress.city || 'Dhaka',
      ship_state: parsedShippingAddress.state || 'Dhaka',
      ship_postcode: parsedShippingAddress.zipCode || '1000',
      ship_country: parsedShippingAddress.country || 'Bangladesh',
      multi_card_name: 'mastercard,visacard,amexcard',
      value_a: orderId, // Store order ID for reference
      value_b: customerInfo.name || 'Customer',
      value_c: '',
      value_d: ''
    };

    console.log('SSLCommerz payment data:', JSON.stringify(data, null, 2));

    // SSLCommerz configuration
    let sslcz;
    try {
      const isLive = process.env.SSLCOMMERZ_IS_LIVE === 'true';
      console.log('Creating SSLCommerz instance with isLive:', isLive);
      
      sslcz = new SSLCommerzPayment(
        process.env.SSLCOMMERZ_STORE_ID,
        process.env.SSLCOMMERZ_STORE_PASSWORD,
        isLive
      );
      console.log('SSLCommerz instance created successfully');
    } catch (sslError) {
      console.error('Error creating SSLCommerz instance:', sslError);
      return res.status(500).json({ 
        error: 'Failed to initialize SSLCommerz instance',
        details: sslError instanceof Error ? sslError.message : 'Unknown SSLCommerz error'
      });
    }

    // Create payment session
    console.log('Calling SSLCommerz init with data...');
    
    let response;
    try {
      response = await sslcz.init(data);
      console.log('SSLCommerz response received:', JSON.stringify(response, null, 2));
    } catch (sslInitError) {
      console.error('Error calling SSLCommerz init:', sslInitError);
      return res.status(500).json({ 
        error: 'SSLCommerz initialization failed',
        details: sslInitError instanceof Error ? sslInitError.message : 'Unknown SSLCommerz init error'
      });
    }

    if (response && response.status === 'SUCCESS') {
      console.log('Payment session created successfully');
      
      // Update order with transaction ID
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentTransactionId: transactionId,
            paymentMethod: 'SSLCommerz'
          }
        });
        console.log('Order updated with transaction ID:', transactionId);
      } catch (updateError) {
        console.error('Error updating order with transaction ID:', updateError);
        // Continue even if update fails, as payment session is created
      }

      res.json({
        success: true,
        paymentUrl: response.GatewayPageURL,
        transactionId: transactionId
      });
    } else {
      console.error('Payment initialization failed:', {
        status: response?.status,
        message: response?.failedreason || response?.msg || 'Unknown error',
        fullResponse: response
      });
      
      res.status(400).json({
        success: false,
        error: 'Failed to initialize payment',
        status: response?.status,
        message: response?.failedreason || response?.msg || 'Unknown error from SSLCommerz',
        details: response
      });
    }
  } catch (error) {
    console.error('=== CRITICAL ERROR in SSLCommerz init ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: typeof error
    });
  }
}
