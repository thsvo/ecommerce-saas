import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withSubdomainCheck } from '@/middleware/subdomainCheck';

const prisma = new PrismaClient();

interface ExtendedNextApiRequest extends NextApiRequest {
  subdomain?: string;
  adminId?: string;
}

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // Check if request is coming from an admin subdomain
    const adminId = req.adminId;
    
    // Create filter conditions
    const productFilter = adminId ? { createdBy: adminId } : {};
    const orderFilter = adminId ? {
      orderItems: {
        some: {
          product: {
            createdBy: adminId
          }
        }
      }
    } : {};
    
    // Get dashboard statistics
    const [
      totalProducts,
      totalOrders,
      totalUsers,
      recentOrders,
      topProducts
    ] = await Promise.all([
      prisma.product.count({
        where: productFilter
      }),
      prisma.order.count({
        where: orderFilter
      }),
      prisma.user.count(),
      prisma.order.findMany({
        where: orderFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true,
          price: true
        },
        _count: {
          productId: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      })
    ]);

    // Calculate total revenue
    const totalRevenue = await prisma.order.aggregate({
      where: orderFilter,
      _sum: {
        total: true
      }
    });

    // Get product details for top products
    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: {
        id: {
          in: topProductIds
        },
        ...productFilter
      }
    });

    const topProductsWithDetails = topProducts.map(product => {
      const details = productDetails.find(p => p.id === product.productId);
      return {
        id: product.productId,
        name: details?.name || 'Unknown Product',
        sales: product._sum.quantity || 0,
        revenue: product._sum.price || 0
      };
    });

    const formattedRecentOrders = recentOrders.map(order => ({
      id: order.id,
      customer: order.user 
        ? `${order.user.firstName} ${order.user.lastName}` 
        : 'Guest Customer',
      total: order.total,
      status: order.status,
      createdAt: order.createdAt
    }));

    res.status(200).json({
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue: totalRevenue._sum.total || 0,
      recentOrders: formattedRecentOrders,
      topProducts: topProductsWithDetails
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withSubdomainCheck(handler);
