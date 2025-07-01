import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v23.0'
    };

    // Check if all required config is present
    const missingConfig = [];
    if (!config.accessToken) missingConfig.push('WHATSAPP_ACCESS_TOKEN');
    if (!config.phoneNumberId) missingConfig.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!config.businessAccountId) missingConfig.push('WHATSAPP_BUSINESS_ACCOUNT_ID');

    if (missingConfig.length > 0) {
      return res.status(500).json({
        success: false,
        message: 'Missing WhatsApp configuration',
        missingConfig,
        configStatus: {
          accessToken: config.accessToken ? 'Set' : 'Missing',
          phoneNumberId: config.phoneNumberId ? 'Set' : 'Missing',
          businessAccountId: config.businessAccountId ? 'Set' : 'Missing'
        }
      });
    }

    // Test WhatsApp API endpoint
    const testUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: {
        body: 'Test message from your e-commerce store! 🛍️'
      }
    };

    console.log('Sending WhatsApp message...');
    console.log('URL:', testUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    
    console.log('WhatsApp API Response:', response.status, responseData);

    if (response.ok) {
      return res.status(200).json({
        success: true,
        message: 'WhatsApp message sent successfully!',
        messageId: responseData.messages?.[0]?.id,
        response: responseData
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Failed to send WhatsApp message',
        error: responseData,
        statusCode: response.status,
        configUsed: {
          apiVersion: config.apiVersion,
          phoneNumberId: config.phoneNumberId,
          hasAccessToken: !!config.accessToken
        }
      });
    }

  } catch (error) {
    console.error('WhatsApp API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
