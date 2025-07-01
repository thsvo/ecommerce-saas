const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (category) {
      where.categoryId = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          reviews: {
            select: {
              rating: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    // Calculate average rating for each product
    const productsWithRating = products.map(product => ({
      ...product,
      averageRating: product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length 
        : 0,
      reviewCount: product.reviews.length
    }));

    res.json({
      products: productsWithRating,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate average rating
    const averageRating = product.reviews.length > 0 
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length 
      : 0;

    res.json({
      ...product,
      averageRating,
      reviewCount: product.reviews.length
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (admin only)
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, description, price, image, stock, categoryId, featured } = req.body;

    if (!name || !description || !price || !image || !categoryId) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        image,
        stock: parseInt(stock) || 0,
        categoryId,
        featured: Boolean(featured)
      },
      include: {
        category: true
      }
    });

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (admin only)
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image, stock, categoryId, featured } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(image && { image }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(categoryId && { categoryId }),
        ...(featured !== undefined && { featured: Boolean(featured) })
      },
      include: {
        category: true
      }
    });

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id }
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get featured products (public)
router.get('/featured/list', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { featured: true },
      include: {
        category: true,
        reviews: {
          select: {
            rating: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    const productsWithRating = products.map(product => ({
      ...product,
      averageRating: product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length 
        : 0,
      reviewCount: product.reviews.length
    }));

    res.json({ products: productsWithRating });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
