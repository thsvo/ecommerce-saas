import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Get adminId from query parameter (passed from subdomain context)
      const { adminId, page = 1, limit = 50, status, search } = req.query;
      
      if (!adminId) {
        return res.status(400).json({ error: 'adminId is required' });
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      // Only show orders for products that belong to this admin
      where.orderItems = {
        some: {
          product: {
            createdBy: adminId as string
          }
        }
      };

      if (status && status !== 'all') {
        where.status = status as string;
      }

      if (search) {
        where.OR = [
          { customerName: { contains: search as string, mode: 'insensitive' } },
          { customerPhone: { contains: search as string, mode: 'insensitive' } },
          { customerEmail: { contains: search as string, mode: 'insensitive' } },
          { 
            user: {
              OR: [
                { firstName: { contains: search as string, mode: 'insensitive' } },
                { lastName: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } }
              ]
            }
          }
        ];
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    image: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.order.count({ where })
      ]);

      res.status(200).json(orders);
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin orders API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
