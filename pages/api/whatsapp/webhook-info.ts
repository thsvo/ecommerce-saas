import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3000';
    
    const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`;
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'not_set';
    
    return res.status(200).json({
      message: 'WhatsApp Webhook Configuration',
      webhook: {
        url: webhookUrl,
        verifyToken: verifyToken !== 'not_set' ? 'Set' : 'Not Set',
        isPublic: true,
        methods: ['GET', 'POST'],
        description: {
          GET: 'Used by WhatsApp to verify the webhook URL',
          POST: 'Used by WhatsApp to send webhook events (messages, status updates)'
        }
      },
      setup: {
        step1: 'Copy the webhook URL above',
        step2: 'Go to Facebook Developers Console > Your App > WhatsApp > Configuration',
        step3: 'Set the webhook URL and verify token',
        step4: 'Subscribe to webhook events (messages, message_deliveries, etc.)',
        step5: 'Test the webhook using the URL above'
      },
      testUrl: `${webhookUrl}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=test123`,
      note: verifyToken === 'not_set' ? 
        'Warning: WHATSAPP_WEBHOOK_VERIFY_TOKEN not set in environment variables' :
        'Configuration looks good! Make sure your server is publicly accessible.'
    });
  } catch (error) {
    console.error('Error in webhook-info:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to generate webhook information'
    });
  }
}
