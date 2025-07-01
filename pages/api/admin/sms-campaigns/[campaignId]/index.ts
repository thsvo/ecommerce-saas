import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { campaignId } = req.query;

  if (!campaignId || typeof campaignId !== 'string') {
    return res.status(400).json({ message: 'Invalid campaign ID' });
  }

  try {
    switch (req.method) {
      case 'DELETE':
        return await deleteCampaign(req, res, campaignId);
      case 'GET':
        return await getCampaign(req, res, campaignId);
      case 'PUT':
        return await updateCampaign(req, res, campaignId);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('SMS Campaign API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getCampaign(req: NextApiRequest, res: NextApiResponse, campaignId: string) {
  try {
    const campaign = await prisma.sMSCampaign.findUnique({
      where: { id: campaignId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    return res.status(200).json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return res.status(500).json({ message: 'Failed to fetch campaign' });
  }
}

async function updateCampaign(req: NextApiRequest, res: NextApiResponse, campaignId: string) {
  try {
    const { name, message, recipients, scheduledAt } = req.body;

    const campaign = await prisma.sMSCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return res.status(400).json({ message: 'Cannot edit sent or failed campaigns' });
    }

    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (message) {
      if (message.length > 1000) {
        return res.status(400).json({ message: 'Message too long (max 1000 characters)' });
      }
      updateData.message = message;
    }
    if (recipients && Array.isArray(recipients)) {
      // Validate phone numbers
      const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
      const invalidNumbers = recipients.filter(num => !phoneRegex.test(num));
      
      if (invalidNumbers.length > 0) {
        return res.status(400).json({ 
          message: 'Invalid phone numbers detected',
          invalidNumbers 
        });
      }
      
      updateData.recipients = recipients;
      updateData.totalCount = recipients.length;
    }
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      updateData.status = scheduledAt ? 'SCHEDULED' : 'DRAFT';
    }

    const updatedCampaign = await prisma.sMSCampaign.update({
      where: { id: campaignId },
      data: updateData
    });

    return res.status(200).json({ 
      message: 'Campaign updated successfully',
      campaign: updatedCampaign 
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return res.status(500).json({ message: 'Failed to update campaign' });
  }
}

async function deleteCampaign(req: NextApiRequest, res: NextApiResponse, campaignId: string) {
  try {
    const campaign = await prisma.sMSCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Delete associated logs first
    await prisma.sMSCampaignLog.deleteMany({
      where: { campaignId }
    });

    // Delete the campaign
    await prisma.sMSCampaign.delete({
      where: { id: campaignId }
    });

    return res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return res.status(500).json({ message: 'Failed to delete campaign' });
  }
}
