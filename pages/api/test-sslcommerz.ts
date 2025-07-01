import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let SSLCommerzPayment;
    try {
      SSLCommerzPayment = require('sslcommerz-lts');
    } catch (ltsError) {
      console.log('sslcommerz-lts not available:', ltsError instanceof Error ? ltsError.message : String(ltsError));
      try {
        SSLCommerzPayment = require('sslcommerz');
      } catch (regularError) {
        console.log('sslcommerz not available:', regularError instanceof Error ? regularError.message : String(regularError));
        throw new Error('No SSLCommerz package found');
      }
    }
    
    if (!SSLCommerzPayment) {
      return res.status(500).json({ 
        error: 'SSLCommerz package not found',
        details: 'Package import failed'
      });
    }

    // Test creating an instance
    const sslcz = new SSLCommerzPayment(
      'test_store_id',
      'test_store_password',
      false
    );

    res.json({ 
      success: true, 
      message: 'SSLCommerz package loaded successfully',
      packageDetails: {
        type: typeof SSLCommerzPayment,
        hasInit: typeof sslcz.init === 'function'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'SSLCommerz test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
