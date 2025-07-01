import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Get adminId from query parameter (passed from subdomain context)
      const { adminId, page = 1, limit = 10, search, role } = req.query;
      
      if (!adminId) {
        return res.status(400).json({ error: 'adminId is required' });
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {};

      // Only show users who have made orders for products from this admin
      // OR users who registered through this subdomain (if we track that)
      where.OR = [
        {
          // Users who have ordered from this admin's products
          orders: {
            some: {
              orderItems: {
                some: {
                  product: {
                    createdBy: adminId as string
                  }
                }
              }
            }
          }
        }
      ];

      if (role && role !== 'all') {
        where.role = role as string;
      }

      if (search) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { lastName: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } }
            ]
          }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            _count: {
              select: {
                orders: {
                  where: {
                    orderItems: {
                      some: {
                        product: {
                          createdBy: adminId as string
                        }
                      }
                    }
                  }
                }
              }
            },
            orders: {
              where: {
                orderItems: {
                  some: {
                    product: {
                      createdBy: adminId as string
                    }
                  }
                }
              },
              select: {
                total: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.user.count({ where })
      ]);

      // Transform the data to include totalOrders and totalSpent
      const transformedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
        totalOrders: user._count.orders,
        totalSpent: user.orders.reduce((sum, order) => sum + order.total, 0)
      }));

      const pagination = {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(total / take),
        totalUsers: total,
        hasNext: skip + take < total,
        hasPrev: parseInt(page as string) > 1
      };

      res.status(200).json({
        users: transformedUsers,
        pagination
      });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
