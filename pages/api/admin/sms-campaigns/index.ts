import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getCampaigns(req, res);
      case 'POST':
        return await createCampaign(req, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('SMS Campaign API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getCampaigns(req: NextApiRequest, res: NextApiResponse) {
  try {
    const campaigns = await prisma.sMSCampaign.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
}

async function createCampaign(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, message, recipients, scheduledAt } = req.body;

    if (!name || !message || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ message: 'Message too long (max 1000 characters)' });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'At least one recipient is required' });
    }

    // Validate phone numbers
    const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
    const invalidNumbers = recipients.filter(num => !phoneRegex.test(num));
    
    if (invalidNumbers.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid phone numbers detected',
        invalidNumbers 
      });
    }

    const campaign = await prisma.sMSCampaign.create({
      data: {
        name,
        message,
        recipients,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        totalCount: recipients.length,
        deliveredCount: 0,
        failedCount: 0
      }
    });

    return res.status(201).json({ 
      message: 'Campaign created successfully',
      campaign 
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({ message: 'Failed to create campaign' });
  }
}
