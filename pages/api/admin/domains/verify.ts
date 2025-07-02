import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { autoVerifyDomain } from '../../../../lib/dnsVerification';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { domainId } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!domainId) {
      return res.status(400).json({ error: 'Domain ID is required' });
    }

    // Find the domain
    const domain = await prisma.customDomain.findFirst({
      where: {
        id: domainId,
        userId
      }
    });

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Update status to verifying
    await prisma.customDomain.update({
      where: { id: domainId },
      data: { status: 'VERIFYING' }
    });

   const targetDomain = process.env.NEXT_PUBLIC_DOMAIN || 'yourdomain.com';
       
    // Perform automatic verification with retries
    const verificationResult = await autoVerifyDomain(
      domain.domain,
      domain.verificationToken,
      targetDomain,
      5, // 5 retries
      10000 // 10 second delay between retries
    );

    // Update domain based on verification result
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
      where: { id: domainId },
      data: updateData
    });

    return res.status(200).json({ 
      success: verificationResult.verified,
      domain: updatedDomain,
      verificationResult,
      message: verificationResult.verified 
        ? 'Domain verified successfully! You can now activate it.'
        : 'Domain verification failed. Please check your DNS settings.'
    });

  } catch (error) {
    console.error('Auto verification error:', error);
    
    // Update domain status to failed
    if (req.body.domainId) {
      try {
        await prisma.customDomain.update({
          where: { id: req.body.domainId },
          data: { 
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        });
      } catch (updateError) {
        console.error('Failed to update domain status:', updateError);
      }
    }

    return res.status(500).json({ 
      error: 'Auto verification failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
