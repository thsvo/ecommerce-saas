import { NextApiRequest, NextApiResponse } from 'next';
import { sendSMSBangladesh } from '../../../lib/sms-bangladesh';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { testNumber, user, password, from } = req.body;

    if (!testNumber || !user || !password) {
      return res.status(400).json({ message: 'Missing required fields: testNumber, user, password' });
    }

    const testMessage = `Test SMS from ${from || 'ECOMMERCE'}. Your SMS configuration is working correctly! Time: ${new Date().toLocaleString()}`;
    
    const result = await sendSMSBangladesh(
      {
        baseUrl: 'https://panel.smsbangladesh.com/api',
        user,
        password,
        from: from || 'ECOMMERCE'
      },
      [testNumber],
      testMessage
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Test SMS error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Test SMS failed: Connection error'
    });
  }
}
