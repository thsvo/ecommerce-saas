import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            orders: {
              include: {
                orderItems: {
                  include: {
                    product: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        });

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const userStats = {
          totalOrders: user.orders.length,
          totalSpent: user.orders.reduce((sum, order) => sum + order.total, 0),
          lastOrderDate: user.orders[0]?.createdAt || null
        };

        res.status(200).json({
          ...user,
          stats: userStats
        });
        break;

      case 'PUT':
        const { email, firstName, lastName, role, password } = req.body;

        const updateData: any = {
          ...(email && { email }),
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(role && { role })
        };

        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        });

        res.status(200).json(updatedUser);
        break;

      case 'DELETE':
        // Check if user has orders
        const ordersCount = await prisma.order.count({
          where: { userId: id }
        });

        if (ordersCount > 0) {
          return res.status(400).json({ 
            error: 'Cannot delete user with existing orders. Consider deactivating instead.' 
          });
        }

        await prisma.user.delete({
          where: { id }
        });

        res.status(200).json({ message: 'User deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('User API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
