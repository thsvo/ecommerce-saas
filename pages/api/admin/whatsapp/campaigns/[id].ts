import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import WhatsAppBusinessAPI from '../../../../../lib/whatsapp-business';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Campaign ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGetCampaign(req, res, id);
      case 'PUT':
        return handleUpdateCampaign(req, res, id);
      case 'DELETE':
        return handleDeleteCampaign(req, res, id);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('WhatsApp campaign API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function handleGetCampaign(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        logs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    return res.status(200).json({ campaign });
  } catch (error) {
    console.error('Error fetching WhatsApp campaign:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch campaign',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleUpdateCampaign(req: NextApiRequest, res: NextApiResponse, id: string) {
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
      scheduledAt
    } = req.body;

    // Check if campaign exists and is editable
    const existingCampaign = await prisma.whatsAppCampaign.findUnique({
      where: { id }
    });

    if (!existingCampaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (existingCampaign.status === 'SENT') {
      return res.status(400).json({ message: 'Cannot update a campaign that has already been sent' });
    }

    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (messageType !== undefined) updateData.messageType = messageType;
    if (textMessage !== undefined) updateData.textMessage = textMessage;
    if (templateName !== undefined) updateData.templateName = templateName;
    if (templateParams !== undefined) updateData.templateParams = templateParams;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (mediaType !== undefined) updateData.mediaType = mediaType;
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      updateData.status = scheduledAt ? 'SCHEDULED' : 'DRAFT';
    }
    if (recipients !== undefined) {
      const recipientNumbers = recipients.split(/[,\n\r]/).map((phone: string) => phone.trim()).filter((phone: string) => phone.length > 0);
      updateData.recipients = recipientNumbers;
      updateData.totalCount = recipientNumbers.length;
    }

    const updatedCampaign = await prisma.whatsAppCampaign.update({
      where: { id },
      data: updateData
    });

    // Log the update
    await prisma.whatsAppCampaignLog.create({
      data: {
        campaignId: id,
        action: 'UPDATED',
        details: { updatedFields: Object.keys(updateData) }
      }
    });

    return res.status(200).json({ 
      message: 'Campaign updated successfully', 
      campaign: updatedCampaign 
    });

  } catch (error) {
    console.error('Error updating WhatsApp campaign:', error);
    return res.status(500).json({ 
      message: 'Failed to update campaign',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleDeleteCampaign(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Check if campaign exists
    const existingCampaign = await prisma.whatsAppCampaign.findUnique({
      where: { id }
    });

    if (!existingCampaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Delete campaign and its logs (cascade delete should handle logs)
    await prisma.whatsAppCampaign.delete({
      where: { id }
    });

    return res.status(200).json({ message: 'Campaign deleted successfully' });

  } catch (error) {
    console.error('Error deleting WhatsApp campaign:', error);
    return res.status(500).json({ 
      message: 'Failed to delete campaign',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
