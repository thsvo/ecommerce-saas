import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v23.0'
    };

    // Check configuration status
    const configStatus = {
      accessToken: {
        present: !!config.accessToken,
        length: config.accessToken ? config.accessToken.length : 0,
        preview: config.accessToken ? `${config.accessToken.substring(0, 20)}...` : 'missing'
      },
      phoneNumberId: {
        present: !!config.phoneNumberId,
        value: config.phoneNumberId || 'missing'
      },
      businessAccountId: {
        present: !!config.businessAccountId,
        value: config.businessAccountId || 'missing'
      },
      webhookVerifyToken: {
        present: !!config.webhookVerifyToken,
        value: config.webhookVerifyToken ? 'configured' : 'missing'
      },
      apiVersion: config.apiVersion
    };

    // If we have access token, try to make a simple API call to validate it
    let apiTest = null;
    if (config.accessToken) {
      try {
        const testUrl = `https://graph.facebook.com/${config.apiVersion}/me?access_token=${config.accessToken}`;
        const response = await fetch(testUrl);
        const data = await response.json();
        
        if (response.ok) {
          apiTest = {
            success: true,
            data: data
          };
        } else {
          apiTest = {
            success: false,
            error: data
          };
        }
      } catch (error) {
        apiTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // If we have business account ID, try to get WhatsApp business accounts
    let businessAccountTest = null;
    if (config.accessToken && config.businessAccountId) {
      try {
        const testUrl = `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}?access_token=${config.accessToken}`;
        const response = await fetch(testUrl);
        const data = await response.json();
        
        businessAccountTest = {
          success: response.ok,
          data: response.ok ? data : data.error
        };
      } catch (error) {
        businessAccountTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // If we have phone number ID, try to get phone number info
    let phoneNumberTest = null;
    if (config.accessToken && config.phoneNumberId) {
      try {
        const testUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}?access_token=${config.accessToken}`;
        const response = await fetch(testUrl);
        const data = await response.json();
        
        phoneNumberTest = {
          success: response.ok,
          data: response.ok ? data : data.error
        };
      } catch (error) {
        phoneNumberTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return res.status(200).json({
      message: 'WhatsApp configuration status',
      configStatus,
      tests: {
        apiTest,
        businessAccountTest,
        phoneNumberTest
      },
      nextSteps: getNextSteps(configStatus)
    });

  } catch (error) {
    console.error('Error checking WhatsApp config:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

function getNextSteps(configStatus: any): string[] {
  const steps: string[] = [];

  if (!configStatus.accessToken.present) {
    steps.push('Add WHATSAPP_ACCESS_TOKEN to your .env file');
  }

  if (!configStatus.phoneNumberId.present) {
    steps.push('Add WHATSAPP_PHONE_NUMBER_ID to your .env file (find this in Facebook Developers Console → WhatsApp → Getting Started)');
  }

  if (!configStatus.businessAccountId.present) {
    steps.push('Add WHATSAPP_BUSINESS_ACCOUNT_ID to your .env file (find this in WhatsApp Manager or API Setup)');
  }

  if (!configStatus.webhookVerifyToken.present) {
    steps.push('Add WHATSAPP_WEBHOOK_VERIFY_TOKEN to your .env file (create a secure random string)');
  }

  if (steps.length === 0) {
    steps.push('All configuration looks good! Try sending a test message.');
  }

  return steps;
}
