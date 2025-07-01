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
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Extract query parameters
    const { page = '1', limit = '10', search, categoryId } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    // If request has adminId from subdomain, filter products by that admin
    if (req.adminId) {
      // Build where clause for filtering
      const whereClause: any = { createdBy: req.adminId };
      
      if (search) {
        whereClause.name = {
          contains: search as string,
          mode: 'insensitive',
        };
      }
      
      if (categoryId) {
        whereClause.categoryId = categoryId as string;
      }

      // Get total count for pagination
      const totalProducts = await prisma.product.count({
        where: whereClause,
      });

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          images: true,
        },
        skip: offset,
        take: limitNumber,
        orderBy: { createdAt: 'desc' },
      });

      const totalPages = Math.ceil(totalProducts / limitNumber);

      return res.status(200).json({
        message: `Products filtered for admin subdomain: ${req.subdomain}`,
        adminId: req.adminId,
        products,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalProducts,
          hasNextPage: pageNumber < totalPages,
          hasPreviousPage: pageNumber > 1,
        },
      });
    } else {
      // No subdomain or not an admin subdomain, return all products (for superadmin)
      const products = await prisma.product.findMany({
        include: {
          category: true,
          images: true,
        },
        skip: offset,
        take: limitNumber,
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ products });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSubdomainCheck(handler);