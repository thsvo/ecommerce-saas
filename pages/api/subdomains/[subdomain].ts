import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { subdomain } = req.query;

  if (!subdomain || typeof subdomain !== 'string') {
    return res.status(400).json({ message: 'Invalid subdomain parameter' });
  }

  try {
    // Find user with this subdomain
    const user = await prisma.user.findUnique({
      where: { subdomain },
      select: { id: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'Subdomain not found' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Subdomain does not belong to an admin' });
    }

    // Return admin information
    return res.status(200).json({
      adminId: user.id,
      role: user.role
    });
  } catch (error) {
    console.error('Error fetching subdomain information:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}