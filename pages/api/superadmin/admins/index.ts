import { NextApiResponse } from 'next';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { superAdminAuth } from '@/lib/superAdminAuth';
import { AuthenticatedRequest } from '@/lib/superAdminAuth';
import { generateUniqueSubdomain } from '@/lib/subdomainUtils';

const prisma = new PrismaClient();

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const admins = await prisma.user.findMany({
        where: { role: Role.ADMIN },
      });
      res.status(200).json(admins);
    } catch (error) {
      console.error('Error fetching admins:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { firstName, lastName, email, password } = req.body;

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Generate a unique subdomain for the admin
      const subdomain = await generateUniqueSubdomain(firstName, lastName);

      const newAdmin = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          subdomain,
          role: Role.ADMIN,
        },
      });
      
      // Remove password from response
      const { password: _, ...adminData } = newAdmin;

      res.status(201).json(adminData);


    } catch (error) {
      console.error('Error creating admin:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default superAdminAuth(handler);
