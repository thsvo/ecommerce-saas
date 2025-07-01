import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const { page = 1, limit = 10, search, role: queryRole } = req.query;
        
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        
        const where: any = {};
        
        if (search) {
          where.OR = [
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastName: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
          ];
        }
        
        if (queryRole) {
          where.role = queryRole as string;
        }
        
        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            skip,
            take,
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              createdAt: true,
              updatedAt: true,
              orders: {
                select: {
                  id: true,
                  total: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }),
          prisma.user.count({ where })
        ]);
        
        const usersWithStats = users.map(user => ({
          ...user,
          totalOrders: user.orders.length,
          totalSpent: user.orders.reduce((sum, order) => sum + order.total, 0)
        }));
        
        res.status(200).json({
          users: usersWithStats,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / take),
            totalItems: total,
            hasNext: skip + take < total,
            hasPrev: Number(page) > 1
          }
        });
        break;
        
      case 'POST':
        const { email, password, firstName, lastName, role } = req.body;
        
        if (!email || !password || !firstName || !lastName) {
          return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });
        
        if (existingUser) {
          return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: (role as 'USER' | 'ADMIN') || 'USER'
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true
          }
        });
        
        res.status(201).json(newUser);
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Users API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
