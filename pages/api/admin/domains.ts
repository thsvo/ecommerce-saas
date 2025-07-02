import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { 
  generateVerificationToken, 
  generateDNSRecords, 
  autoVerifyDomain,
  isValidDomain 
} from '../../../lib/dnsVerification';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return getDomains(req, res);
  } else if (req.method === 'POST') {
    return addDomain(req, res);
  } else if (req.method === 'PUT') {
    return updateDomain(req, res);
  } else if (req.method === 'DELETE') {
    return deleteDomain(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get all domains for the authenticated admin
async function getDomains(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get user ID from session/auth (implement your auth logic here)
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const domains = await prisma.customDomain.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({ domains });
  } catch (error) {
    console.error('Error fetching domains:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Add a new custom domain
async function addDomain(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { domain } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!domain || !isValidDomain(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Check if domain already exists
    const existingDomain = await prisma.customDomain.findUnique({
      where: { domain }
    });

    if (existingDomain) {
      return res.status(400).json({ error: 'Domain already exists' });
    }

    // Generate verification token and DNS records
    const verificationToken = generateVerificationToken();
    const targetDomain =  'codeopx.com';
    const dnsRecords = generateDNSRecords(domain, verificationToken, targetDomain);

    // Create domain record
    const customDomain = await prisma.customDomain.create({
      data: {
        domain,
        userId,
        verificationToken,
        dnsRecords: JSON.stringify(dnsRecords),
        status: 'PENDING'
      }
    });

    return res.status(201).json({ 
      customDomain,
      instructions: {
        message: 'Please add the following DNS records to verify domain ownership:',
        records: dnsRecords
      }
    });
  } catch (error) {
    console.error('Error adding domain:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Update domain (verify)
async function updateDomain(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, action } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const domain = await prisma.customDomain.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (action === 'verify') {
      // Update status to verifying
      await prisma.customDomain.update({
        where: { id },
        data: { status: 'VERIFYING' }
      });

      const targetDomain = process.env.NEXT_PUBLIC_DOMAIN || 'codeopx.com';
      
      // Perform verification
      const verificationResult = await autoVerifyDomain(
        domain.domain,
        domain.verificationToken,
        targetDomain
      );

      // Update domain status based on verification result
      const updateData: any = {
        lastVerified: new Date(),
      };

      if (verificationResult.verified) {
        updateData.status = 'VERIFIED';
        updateData.verifiedAt = new Date();
        updateData.errorMessage = null;
      } else {
        updateData.status = 'FAILED';
        updateData.errorMessage = verificationResult.errors.join(', ');
      }

      const updatedDomain = await prisma.customDomain.update({
        where: { id },
        data: updateData
      });

      return res.status(200).json({ 
        customDomain: updatedDomain,
        verificationResult 
      });
    } else if (action === 'activate') {
      // Activate domain if verified
      if (domain.status !== 'VERIFIED') {
        return res.status(400).json({ error: 'Domain must be verified before activation' });
      }

      const updatedDomain = await prisma.customDomain.update({
        where: { id },
        data: { 
          status: 'ACTIVE',
          isActive: true 
        }
      });

      return res.status(200).json({ customDomain: updatedDomain });
    } else if (action === 'deactivate') {
      const updatedDomain = await prisma.customDomain.update({
        where: { id },
        data: { 
          status: 'INACTIVE',
          isActive: false 
        }
      });

      return res.status(200).json({ customDomain: updatedDomain });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error updating domain:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete domain
async function deleteDomain(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const domain = await prisma.customDomain.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    await prisma.customDomain.delete({
      where: { id }
    });

    return res.status(200).json({ message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
