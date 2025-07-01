const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.review.count({ where: { productId } })
    ]);

    // Calculate average rating
    const ratings = await prisma.review.findMany({
      where: { productId },
      select: { rating: true }
    });

    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length 
      : 0;

    res.json({
      reviews,
      averageRating,
      totalReviews: total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create review
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ 
        error: 'Product ID and rating are required' 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user has purchased this product
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId: req.user.id,
          status: 'DELIVERED'
        }
      }
    });

    if (!hasPurchased) {
      return res.status(400).json({ 
        error: 'You can only review products you have purchased' 
      });
    }

    // Check if user has already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });

    if (existingReview) {
      return res.status(400).json({ 
        error: 'You have already reviewed this product' 
      });
    }

    const review = await prisma.review.create({
      data: {
        userId: req.user.id,
        productId,
        rating: parseInt(rating),
        comment
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        product: {
          select: {
            name: true
          }
        }
      }
    });

    res.status(201).json({ message: 'Review created successfully', review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update review
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    // Check if review belongs to user
    const existingReview = await prisma.review.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = await prisma.review.update({
      where: { id },
      data: {
        ...(rating && { rating: parseInt(rating) }),
        ...(comment !== undefined && { comment })
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        product: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({ message: 'Review updated successfully', review });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete review
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if review belongs to user
    const existingReview = await prisma.review.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await prisma.review.delete({
      where: { id }
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's reviews
router.get('/user/my-reviews', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId: req.user.id },
        include: {
          product: {
            select: {
              name: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.review.count({ where: { userId: req.user.id } })
    ]);

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
