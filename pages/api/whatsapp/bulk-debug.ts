import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { recipients, message } = req.body;
    
    if (!recipients || !message) {
      return res.status(400).json({ 
        message: 'Recipients and message are required',
        received: { recipients, message }
      });
    }

    // Parse recipients
    let phoneNumbers: string[] = [];
    if (typeof recipients === 'string') {
      phoneNumbers = recipients
        .split(/[,\n\r]/)
        .map((phone: string) => phone.trim())
        .filter((phone: string) => phone.length > 0);
    } else if (Array.isArray(recipients)) {
      phoneNumbers = recipients;
    }

    console.log('Parsed phone numbers:', phoneNumbers);

    const config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v23.0'
    };

    const results = {
      successful: [] as Array<{ phoneNumber: string; messageId: string; response: any }>,
      failed: [] as Array<{ phoneNumber: string; error: string; details: any }>
    };

    // Test each phone number individually
    for (const phoneNumber of phoneNumbers) {
      try {
        console.log(`Testing phone number: ${phoneNumber}`);
        
        // Validate phone number format
        if (!phoneNumber.startsWith('+')) {
          throw new Error('Phone number must start with + (international format)');
        }

        const testUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
        
        const payload = {
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: {
            body: message
          }
        };

        console.log(`Sending to ${phoneNumber}:`, JSON.stringify(payload, null, 2));

        const response = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        
        console.log(`Response for ${phoneNumber}:`, response.status, responseData);

        if (response.ok && responseData.messages) {
          results.successful.push({
            phoneNumber,
            messageId: responseData.messages[0].id,
            response: responseData
          });
        } else {
          results.failed.push({
            phoneNumber,
            error: responseData.error?.message || 'Unknown error',
            details: responseData
          });
        }

      } catch (error) {
        results.failed.push({
          phoneNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          details: error
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return res.status(200).json({
      message: 'Bulk test completed',
      summary: {
        total: phoneNumbers.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      results,
      config: {
        apiVersion: config.apiVersion,
        phoneNumberId: config.phoneNumberId,
        hasAccessToken: !!config.accessToken
      }
    });

  } catch (error) {
    console.error('Bulk test error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
