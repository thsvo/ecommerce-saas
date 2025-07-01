import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import WhatsAppBusinessAPI from '@/lib/whatsapp-business';


const prisma = new PrismaClient();

// WhatsApp Business API Configuration
const getWhatsAppConfig = () => ({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v23.0'
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Campaign ID is required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if campaign exists and is sendable
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status === 'SENT') {
      return res.status(400).json({ message: 'Campaign has already been sent' });
    }

    // Validate WhatsApp API configuration
    const config = getWhatsAppConfig();
    if (!config.accessToken || !config.phoneNumberId) {
      return res.status(500).json({ 
        message: 'WhatsApp API configuration is missing. Please check your environment variables.' 
      });
    }

    const whatsappAPI = new WhatsAppBusinessAPI(config);

    // Prepare message data based on campaign type
    let messageData: any;
    let messageType: 'text' | 'template' | 'media';

    switch (campaign.messageType) {
      case 'TEXT':
        messageType = 'text';
        messageData = { message: campaign.textMessage };
        break;
      case 'TEMPLATE':
        messageType = 'template';
        messageData = {
          templateName: campaign.templateName,
          languageCode: 'en',
          components: campaign.templateParams ? JSON.parse(campaign.templateParams as string) : undefined
        };
        break;
      case 'MEDIA':
        messageType = 'media';
        messageData = {
          mediaType: campaign.mediaType?.toLowerCase(),
          mediaUrl: campaign.mediaUrl,
          caption: campaign.textMessage
        };
        break;
      default:
        return res.status(400).json({ message: `Unsupported message type: ${campaign.messageType}` });
    }

    // Update campaign status to sending
    await prisma.whatsAppCampaign.update({
      where: { id },
      data: { status: 'SENT' } // We'll update this based on results
    });

    // Send bulk messages
    const result = await whatsappAPI.sendBulkMessages(
      campaign.recipients,
      messageType,
      messageData,
      2000 // 2 second delay between messages
    );

    // Update campaign with results
    const finalStatus = result.failed.length === 0 ? 'SENT' : 
                       (result.successful.length > 0 ? 'SENT' : 'FAILED');

    await prisma.whatsAppCampaign.update({
      where: { id },
      data: {
        status: finalStatus,
        sentAt: new Date(),
        deliveredCount: result.successful.length,
        failedCount: result.failed.length,
        failedNumbers: result.failed.map(f => f.phoneNumber),
        apiResponse: result
      }
    });

    // Log the send action
    await prisma.whatsAppCampaignLog.create({
      data: {
        campaignId: id,
        action: 'SENT',
        details: {
          successfulCount: result.successful.length,
          failedCount: result.failed.length,
          successful: result.successful,
          failed: result.failed
        }
      }
    });

    return res.status(200).json({
      message: `Campaign sent successfully. ${result.successful.length} delivered, ${result.failed.length} failed.`,
      result: {
        successfulCount: result.successful.length,
        failedCount: result.failed.length,
        successful: result.successful,
        failed: result.failed
      }
    });

  } catch (error) {
    console.error('Error sending WhatsApp campaign:', error);
    
    // Update campaign status to failed
    try {
      await prisma.whatsAppCampaign.update({
        where: { id },
        data: { status: 'FAILED' }
      });
    } catch (updateError) {
      console.error('Error updating campaign status to failed:', updateError);
    }

    return res.status(500).json({ 
      message: 'Failed to send campaign',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
