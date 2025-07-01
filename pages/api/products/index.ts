import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withSubdomainCheck } from '@/middleware/subdomainCheck';

const prisma = new PrismaClient();

interface ExtendedNextApiRequest extends NextApiRequest {
  subdomain?: string;
  adminId?: string;
}

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const { page = 1, limit = 10, search, categoryId: queryCategoryId, sortBy, adminId } = req.query;
        
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        
        const where: any = {};
        
        // If there's a subdomain or adminId filter, add it to the where clause
        if (req.adminId || adminId) {
          where.createdBy = req.adminId || adminId;
        }
        
        if (search) {
          where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } }
          ];
        }
        
        if (queryCategoryId) {
          where.categoryId = queryCategoryId as string;
        }

        // Handle sorting
        let orderBy: any = { createdAt: 'desc' }; // default sort
        
        switch (sortBy) {
          case 'price-low':
            orderBy = { price: 'asc' };
            break;
          case 'price-high':
            orderBy = { price: 'desc' };
            break;
          case 'name':
            orderBy = { name: 'asc' };
            break;
          case 'featured':
            orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }];
            break;
          case 'newest':
            orderBy = { createdAt: 'desc' };
            break;
          default:
            orderBy = { createdAt: 'desc' };
        }
        
        const [products, total] = await Promise.all([
          prisma.product.findMany({
            where,
            skip,
            take,
            include: {
              category: true,
              reviews: {
                select: {
                  rating: true
                }
              },
              images: true
            },
            orderBy
          }),
          prisma.product.count({ where })
        ]);
        
        // Calculate average rating for each product
        let productsWithRating = products.map(product => ({
          ...product,
          averageRating: product.reviews.length > 0 
            ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
            : 0,
          reviewCount: product.reviews.length
        }));

        // Handle rating sort (needs to be done after calculation)
        if (sortBy === 'rating') {
          productsWithRating.sort((a, b) => b.averageRating - a.averageRating);
        }
        
        res.status(200).json({
          products: productsWithRating,
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
        const { name, description, price, categoryId, image, stock, featured, tempImages } = req.body;
        
        if (!name || !price || !categoryId) {
          return res.status(400).json({ error: 'Name, price, and category are required' });
        }
        
        // For subdomain requests, set the createdBy to the admin ID
        const productData: any = {
          name,
          description,
          price: parseFloat(price),
          categoryId,
          image: image || '',
          stock: parseInt(stock) || 0,
          featured: Boolean(featured) || false
        };
        
        if (req.adminId) {
          productData.createdBy = req.adminId;
        }
        
        const newProduct = await prisma.product.create({
          data: productData,
          include: {
            category: true
          }
        });
        
        // If there are temporary images, create them in the database
        if (tempImages && Array.isArray(tempImages) && tempImages.length > 0) {
          await Promise.all(
            tempImages.map(async (tempImage: { url: string, isMain: boolean }) => {
              await prisma.productImage.create({
                data: {
                  url: tempImage.url,
                  productId: newProduct.id,
                  isMain: tempImage.isMain,
                }
              });
            })
          );
        }
        
        res.status(201).json(newProduct);
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Products API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withSubdomainCheck(handler);
