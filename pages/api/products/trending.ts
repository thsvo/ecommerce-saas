import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = 6 } = req.query;
    const take = Math.min(Number(limit), 20); // Maximum 20 products

    // First, find trending categories based on recent order activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get categories with order counts in the last 30 days
    const categoryOrderCounts = await prisma.category.findMany({
      include: {
        products: {
          include: {
            orderItems: {
              where: {
                order: {
                  createdAt: {
                    gte: thirtyDaysAgo
                  },
                  status: {
                    in: ['DELIVERED', 'CONFIRMED']
                  }
                }
              }
            }
          }
        }
      }
    });

    // Calculate trending score for each category
    const categoriesWithScore = categoryOrderCounts.map(category => {
      const totalRecentOrders = category.products.reduce((sum, product) => 
        sum + product.orderItems.length, 0
      );
      
      return {
        ...category,
        recentOrderCount: totalRecentOrders
      };
    });

    // Sort categories by recent order activity and get top trending categories
    const trendingCategories = categoriesWithScore
      .filter(cat => cat.recentOrderCount > 0) // Only categories with recent orders
      .sort((a, b) => b.recentOrderCount - a.recentOrderCount)
      .slice(0, 3); // Top 3 trending categories

    // If no trending categories found, fall back to all categories
    const targetCategories = trendingCategories.length > 0 
      ? trendingCategories.map(cat => cat.id)
      : categoryOrderCounts.slice(0, 5).map(cat => cat.id); // Top 5 categories as fallback

    // Get products from trending categories
    const trendingProducts = await prisma.product.findMany({
      where: {
        categoryId: {
          in: targetCategories
        }
      },
      include: {
        category: true,
        reviews: {
          select: {
            rating: true
          }
        },
        images: true,
        orderItems: {
          include: {
            order: {
              select: {
                createdAt: true,
                status: true
              }
            }
          }
        }
      },
      take: take * 2, // Get more products to calculate trending score
    });

    // Calculate trending score for each product
    const productsWithTrendingScore = trendingProducts.map(product => {
      // Calculate average rating
      const averageRating = product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      // Calculate recent orders (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentOrders = product.orderItems.filter(
        item => item.order.createdAt >= thirtyDaysAgo && 
                (item.order.status === 'DELIVERED' || item.order.status === 'CONFIRMED')
      ).length;

      // Calculate total orders
      const totalOrders = product.orderItems.filter(
        item => item.order.status === 'DELIVERED' || item.order.status === 'CONFIRMED'
      ).length;

      // Calculate trending score (weighted combination)
      // 40% recent orders, 30% total orders, 30% rating
      const trendingScore = (recentOrders * 0.4) + (totalOrders * 0.3) + (averageRating * 0.3);

      return {
        ...product,
        averageRating,
        reviewCount: product.reviews.length,
        recentOrderCount: recentOrders,
        totalOrderCount: totalOrders,
        trendingScore,
        // Remove orderItems from response for cleaner data
        orderItems: undefined
      };
    });

    // Sort by trending score and get top products
    const topTrendingProducts = productsWithTrendingScore
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, take);

    res.status(200).json({
      products: topTrendingProducts,
      total: topTrendingProducts.length
    });

  } catch (error) {
    console.error('Error fetching trending products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
