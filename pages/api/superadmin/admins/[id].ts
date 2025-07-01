import { NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { superAdminAuth } from '@/lib/superAdminAuth';
import { AuthenticatedRequest } from '@/lib/superAdminAuth';

const prisma = new PrismaClient();

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  if (req.method === 'PUT') {
    try {
      const { firstName, lastName, email, password } = req.body;

      const updateData: any = {
        firstName,
        lastName,
        email,
      };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedAdmin = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      res.status(200).json(updatedAdmin);
    } catch (error) {
      console.error('Error updating admin:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.user.delete({
        where: { id },
      });
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting admin:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default superAdminAuth(handler);
