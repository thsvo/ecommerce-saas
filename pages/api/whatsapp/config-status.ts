import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const requiredEnvVars = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID', 
    'WHATSAPP_BUSINESS_ACCOUNT_ID',
    'WHATSAPP_WEBHOOK_VERIFY_TOKEN'
  ];

  const envStatus = requiredEnvVars.map(varName => ({
    name: varName,
    isSet: !!process.env[varName] && process.env[varName] !== 'your_phone_number_id_here' && process.env[varName] !== 'your_business_account_id_here',
    value: process.env[varName] ? 
      (varName.includes('TOKEN') ? 'Set (hidden)' : 
       process.env[varName]?.startsWith('your_') ? 'Placeholder - needs to be updated' : 'Set') 
      : 'Not set'
  }));

  const allConfigured = envStatus.every(env => env.isSet);

  return res.status(200).json({
    message: 'WhatsApp Configuration Status',
    webhookUrl: 'https://whatsapp-two-delta.vercel.app/api/webhooks/whatsapp',
    testWebhookUrl: `https://whatsapp-two-delta.vercel.app/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN}&hub.challenge=test123`,
    configurationStatus: {
      allConfigured,
      missingCount: envStatus.filter(env => !env.isSet).length,
      details: envStatus
    },
    nextSteps: allConfigured ? [
      'Configuration complete!',
      'Test your webhook using the testWebhookUrl above',
      'Configure the webhook URL in Facebook Developers Console',
      'Send a test message to verify everything works'
    ] : [
      'Update the placeholder values in your environment variables',
      'Get Phone Number ID from WhatsApp > API Setup',
      'Get Business Account ID from WhatsApp > API Setup',
      'Redeploy after updating environment variables'
    ],
    howToGetIds: {
      phoneNumberId: {
        step1: 'Go to Facebook Developers Console > Your App',
        step2: 'Navigate to WhatsApp > API Setup',
        step3: 'Look for the "From" dropdown - Phone Number ID is displayed below/next to it',
        step4: 'Copy the long number (like 123456789012345)'
      },
      businessAccountId: {
        step1: 'Go to Facebook Developers Console > Your App', 
        step2: 'Navigate to WhatsApp > API Setup',
        step3: 'Look for "WhatsApp Business Account ID" in the top section',
        step4: 'Copy the long number (like 123456789012345)'
      }
    }
  });
}
