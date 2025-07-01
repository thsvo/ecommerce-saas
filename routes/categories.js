const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all categories (public)
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single category (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            reviews: {
              select: {
                rating: true
              }
            }
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Add average rating to products
    const categoryWithRating = {
      ...category,
      products: category.products.map(product => ({
        ...product,
        averageRating: product.reviews.length > 0 
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length 
          : 0,
        reviewCount: product.reviews.length
      }))
    };

    res.json({ category: categoryWithRating });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create category (admin only)
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, description, image } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        image
      }
    });

    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category (admin only)
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(image && { image })
      }
    });

    res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: id }
    });

    if (productCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing products' 
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
