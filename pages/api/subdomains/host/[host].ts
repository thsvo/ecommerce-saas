import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { extractSubdomain } from '@/lib/subdomainUtils';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { host } = req.query;

  if (!host || typeof host !== 'string') {
    return res.status(400).json({ message: 'Invalid host parameter' });
  }

  try {
    // First, check if the host is a custom domain
    const customDomain = await prisma.customDomain.findUnique({
      where: { domain: host },
      include: { user: true },
    });

    if (customDomain && customDomain.user) {
      if (customDomain.user.role === 'ADMIN') {
        return res.status(200).json({
          adminId: customDomain.user.id,
          role: customDomain.user.role,
          subdomain: customDomain.user.subdomain,
          customDomain: customDomain.domain,
          isCustomDomain: true,
          isAdminSubdomain: false,
          storeName: customDomain.user.storeName,
        });
      } else {
        return res.status(403).json({ message: 'User for custom domain is not an admin' });
      }
    }

    // If not a custom domain, try to extract a subdomain
    const subdomain = extractSubdomain(host);

    if (!subdomain || subdomain === 'www') {
      return res.status(404).json({ message: 'No custom domain or valid subdomain found' });
    }

    // Find user with this subdomain
    const user = await prisma.user.findUnique({
      where: { subdomain },
      select: { id: true, role: true, storeName: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'Subdomain not found' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Subdomain does not belong to an admin' });
    }

    // Return admin information for the subdomain
    return res.status(200).json({
      adminId: user.id,
      role: user.role,
      subdomain: subdomain,
      customDomain: null,
      isCustomDomain: false,
      isAdminSubdomain: true,
      storeName: user.storeName,
    });
  } catch (error) {
    console.error('Error fetching host information:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
