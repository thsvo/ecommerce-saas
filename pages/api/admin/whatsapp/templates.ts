import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import WhatsAppBusinessAPI from '../../../../lib/whatsapp-business';

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
        return handleGetTemplates(req, res);
      case 'POST':
        return handleCreateTemplate(req, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('WhatsApp templates API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function handleGetTemplates(req: NextApiRequest, res: NextApiResponse) {
  try {
    // First try to get templates from Meta API
    const config = getWhatsAppConfig();
    if (config.accessToken && config.businessAccountId) {
      try {
        const whatsappAPI = new WhatsAppBusinessAPI(config);
        const metaTemplates = await whatsappAPI.getMessageTemplates();
        
        // Store/update templates in database
        for (const template of metaTemplates.data || []) {
          await prisma.whatsAppTemplate.upsert({
            where: { name: template.name },
            update: {
              displayName: template.name,
              category: template.category,
              language: template.language,
              status: template.status,
              components: template.components
            },
            create: {
              name: template.name,
              displayName: template.name,
              category: template.category,
              language: template.language,
              status: template.status,
              components: template.components
            }
          });
        }
      } catch (apiError) {
        console.warn('Failed to fetch templates from Meta API:', apiError);
      }
    }

    // Get templates from database
    const templates = await prisma.whatsAppTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ templates });
  } catch (error) {
    console.error('Error fetching WhatsApp templates:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch templates',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleCreateTemplate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      displayName,
      category,
      language = 'en',
      components
    } = req.body;

    if (!name || !displayName || !category || !components) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, displayName, category, components' 
      });
    }

    // Validate template structure
    if (!Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ 
        message: 'Components must be a non-empty array' 
      });
    }

    // Create template in Meta API first
    const config = getWhatsAppConfig();
    if (config.accessToken && config.businessAccountId) {
      try {
        const whatsappAPI = new WhatsAppBusinessAPI(config);
        const templateData = {
          name,
          category,
          language,
          components
        };
        
        await whatsappAPI.createMessageTemplate(templateData);
      } catch (apiError) {
        console.error('Failed to create template in Meta API:', apiError);
        return res.status(500).json({ 
          message: 'Failed to create template in Meta API',
          error: apiError instanceof Error ? apiError.message : 'Unknown error'
        });
      }
    }

    // Store template in database
    const template = await prisma.whatsAppTemplate.create({
      data: {
        name,
        displayName,
        category,
        language,
        status: 'PENDING', // Will be updated when approved by Meta
        components
      }
    });

    return res.status(201).json({ 
      message: 'Template created successfully', 
      template 
    });

  } catch (error) {
    console.error('Error creating WhatsApp template:', error);
    return res.status(500).json({ 
      message: 'Failed to create template',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
