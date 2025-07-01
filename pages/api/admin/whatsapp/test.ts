import { NextApiRequest, NextApiResponse } from 'next';
import WhatsAppBusinessAPI, { validateWhatsAppMessage } from '../../../../lib/whatsapp-business';

// WhatsApp Business API Configuration
const getWhatsAppConfig = () => ({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v23.0'
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber, message, messageType = 'text' } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        message: 'Phone number and message are required' 
      });
    }

    // Validate message
    const validation = validateWhatsAppMessage(message);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Invalid message content', 
        errors: validation.errors 
      });
    }

    // Check WhatsApp API configuration
    const config = getWhatsAppConfig();
    if (!config.accessToken || !config.phoneNumberId) {
      return res.status(500).json({ 
        message: 'WhatsApp API configuration is missing. Please check your environment variables.',
        missingConfig: {
          accessToken: !config.accessToken,
          phoneNumberId: !config.phoneNumberId,
          businessAccountId: !config.businessAccountId
        }
      });
    }

    const whatsappAPI = new WhatsAppBusinessAPI(config);

    let result;
    switch (messageType) {
      case 'text':
        result = await whatsappAPI.sendTextMessage(phoneNumber, message);
        break;
      default:
        return res.status(400).json({ message: 'Unsupported message type for testing' });
    }

    return res.status(200).json({
      message: 'Test message sent successfully',
      result,
      config: {
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId,
        apiVersion: config.apiVersion,
        hasAccessToken: !!config.accessToken
      }
    });

  } catch (error) {
    console.error('Error sending test WhatsApp message:', error);
    return res.status(500).json({ 
      message: 'Failed to send test message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
