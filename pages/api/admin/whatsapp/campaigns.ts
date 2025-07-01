import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import WhatsAppBusinessAPI, { parseWhatsAppRecipients, validateWhatsAppMessage } from '../../../../lib/whatsapp-business';

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
  try {
    switch (req.method) {
      case 'GET':
        return handleGetCampaigns(req, res);
      case 'POST':
        return handleCreateCampaign(req, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('WhatsApp campaigns API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function handleGetCampaigns(req: NextApiRequest, res: NextApiResponse) {
  try {
    const campaigns = await prisma.whatsAppCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    return res.status(200).json({ campaigns });
  } catch (error) {
    console.error('Error fetching WhatsApp campaigns:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch campaigns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleCreateCampaign(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      messageType,
      textMessage,
      templateName,
      templateParams,
      mediaUrl,
      mediaType,
      recipients,
      scheduledAt,
      sendImmediately = false
    } = req.body;

    // Validation
    if (!name || !messageType || !recipients) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, messageType, recipients' 
      });
    }

    // Parse and validate recipients
    const recipientNumbers = parseWhatsAppRecipients(recipients);
    if (recipientNumbers.length === 0) {
      return res.status(400).json({ 
        message: 'No valid phone numbers found in recipients' 
      });
    }

    // Validate message content based on type
    if (messageType === 'TEXT') {
      if (!textMessage) {
        return res.status(400).json({ message: 'Text message is required for TEXT type' });
      }
      
      const validation = validateWhatsAppMessage(textMessage);
      if (!validation.isValid) {
        return res.status(400).json({ 
          message: 'Invalid message content', 
          errors: validation.errors 
        });
      }
    } else if (messageType === 'TEMPLATE' && !templateName) {
      return res.status(400).json({ message: 'Template name is required for TEMPLATE type' });
    } else if (messageType === 'MEDIA' && (!mediaUrl || !mediaType)) {
      return res.status(400).json({ message: 'Media URL and type are required for MEDIA type' });
    }

    // Create campaign in database
    const campaign = await prisma.whatsAppCampaign.create({
      data: {
        name,
        messageType,
        textMessage,
        templateName,
        templateParams,
        mediaUrl,
        mediaType,
        recipients: recipientNumbers,
        totalCount: recipientNumbers.length,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: sendImmediately ? 'SENT' : (scheduledAt ? 'SCHEDULED' : 'DRAFT')
      }
    });

    // Log campaign creation
    await prisma.whatsAppCampaignLog.create({
      data: {
        campaignId: campaign.id,
        action: 'CREATED',
        details: {
          messageType,
          recipientCount: recipientNumbers.length,
          sendImmediately,
          scheduledAt
        }
      }
    });

    // Send immediately if requested
    if (sendImmediately) {
      try {
        await sendCampaign(campaign.id);
        return res.status(201).json({ 
          message: 'Campaign created and sent successfully', 
          campaign 
        });
      } catch (error) {
        // Update campaign status to failed
        await prisma.whatsAppCampaign.update({
          where: { id: campaign.id },
          data: { status: 'FAILED' }
        });

        return res.status(500).json({ 
          message: 'Campaign created but failed to send', 
          error: error instanceof Error ? error.message : 'Unknown error',
          campaign 
        });
      }
    }

    return res.status(201).json({ 
      message: 'Campaign created successfully', 
      campaign 
    });

  } catch (error) {
    console.error('Error creating WhatsApp campaign:', error);
    return res.status(500).json({ 
      message: 'Failed to create campaign',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to send a campaign
async function sendCampaign(campaignId: string) {
  const config = getWhatsAppConfig();
  
  if (!config.accessToken || !config.phoneNumberId) {
    throw new Error('WhatsApp API configuration is missing');
  }

  const whatsappAPI = new WhatsAppBusinessAPI(config);

  const campaign = await prisma.whatsAppCampaign.findUnique({
    where: { id: campaignId }
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  let messageData: any;
  let messageType: 'text' | 'template' | 'media';

  // Prepare message data based on campaign type
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
        caption: campaign.textMessage // Use text message as caption for media
      };
      break;
    default:
      throw new Error(`Unsupported message type: ${campaign.messageType}`);
  }

  // Send bulk messages
  const result = await whatsappAPI.sendBulkMessages(
    campaign.recipients,
    messageType,
    messageData,
    2000 // 2 second delay between messages
  );

  // Update campaign status and counts
  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: {
      status: result.failed.length === 0 ? 'SENT' : (result.successful.length > 0 ? 'SENT' : 'FAILED'),
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
      campaignId,
      action: 'SENT',
      details: {
        successfulCount: result.successful.length,
        failedCount: result.failed.length,
        successful: result.successful,
        failed: result.failed
      }
    }
  });

  return result;
}
