import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { sendSMSBangladesh } from '../../../../../lib/sms-bangladesh';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { campaignId } = req.query;

  if (!campaignId || typeof campaignId !== 'string') {
    return res.status(400).json({ message: 'Invalid campaign ID' });
  }

  try {
    switch (req.method) {
      case 'POST':
        return await sendCampaign(req, res, campaignId);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('SMS Campaign Send API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function sendCampaign(req: NextApiRequest, res: NextApiResponse, campaignId: string) {
  try {
    const { apiConfig } = req.body; // Get SMS Bangladesh config from frontend

    if (!apiConfig || !apiConfig.user || !apiConfig.password) {
      return res.status(400).json({ message: 'SMS Bangladesh configuration is required' });
    }

    // Find the campaign
    const campaign = await prisma.sMSCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return res.status(400).json({ message: 'Campaign already sent or failed' });
    }

    // Send SMS via SMS Bangladesh API on the backend
    const smsResult = await sendSMSBangladesh(
      {
        baseUrl: apiConfig.baseUrl || 'https://panel.smsbangladesh.com/api',
        user: apiConfig.user,
        password: apiConfig.password,
        from: apiConfig.from || 'ECOMMERCE'
      },
      campaign.recipients,
      campaign.message
    );

    // Calculate delivery statistics
    const totalCount = campaign.recipients.length;
    let deliveredCount = 0;
    let failedCount = 0;
    let status: 'SENT' | 'FAILED' = 'SENT';

    if (smsResult.success) {
      deliveredCount = totalCount - (smsResult.failedNumbers?.length || 0);
      failedCount = smsResult.failedNumbers?.length || 0;
      
      // If more than 50% failed, mark as failed
      if (failedCount > totalCount * 0.5) {
        status = 'FAILED';
      }
    } else {
      failedCount = totalCount;
      status = 'FAILED';
    }

    // Update campaign in database
    const updatedCampaign = await prisma.sMSCampaign.update({
      where: { id: campaignId },
      data: {
        status,
        sentAt: new Date(),
        deliveredCount,
        failedCount,
        apiProvider: 'SMS_BANGLADESH',
        apiResponse: JSON.parse(JSON.stringify(smsResult)), // Convert to plain object
        failedNumbers: smsResult.failedNumbers || []
      }
    });

    // Log campaign activity
    await prisma.sMSCampaignLog.create({
      data: {
        campaignId,
        action: 'SENT',
        details: {
          apiProvider: 'SMS_BANGLADESH',
          deliveredCount,
          failedCount,
          apiResponse: JSON.parse(JSON.stringify(smsResult)) // Convert to plain object
        }
        // userId is optional now (no authentication)
      }
    });

    return res.status(200).json({ 
      message: 'Campaign sent successfully',
      campaign: updatedCampaign,
      stats: {
        totalCount,
        deliveredCount,
        failedCount,
        successRate: ((deliveredCount / totalCount) * 100).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return res.status(500).json({ message: 'Failed to send campaign' });
  }
}
