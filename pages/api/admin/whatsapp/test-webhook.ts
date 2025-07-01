import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL is required' });
    }

    // Test if webhook URL is accessible
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'test_token';
    
    const testPayload = {
      'hub.mode': 'subscribe',
      'hub.verify_token': verifyToken,
      'hub.challenge': 'test_challenge_12345'
    };

    const params = new URLSearchParams(testPayload);
    const testUrl = `${webhookUrl}?${params.toString()}`;

    console.log('Testing webhook URL:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'WhatsApp-Webhook-Test/1.0'
      }
    });

    const responseText = await response.text();

    if (response.ok && responseText === 'test_challenge_12345') {
      return res.status(200).json({
        success: true,
        message: 'Webhook verification successful!',
        details: {
          status: response.status,
          response: responseText,
          url: testUrl
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Webhook verification failed',
        details: {
          status: response.status,
          response: responseText,
          expected: 'test_challenge_12345',
          url: testUrl
        }
      });
    }

  } catch (error) {
    console.error('Error testing webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
