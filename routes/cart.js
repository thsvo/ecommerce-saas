const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get user's cart
router.get('/', authenticateToken, async (req, res) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    });

    const total = cartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    res.json({ 
      cartItems,
      total,
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to cart
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists and has enough stock
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check if item already exists in cart
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });

    let cartItem;

    if (existingCartItem) {
      // Update quantity
      const newQuantity = existingCartItem.quantity + parseInt(quantity);
      
      if (product.stock < newQuantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          userId: req.user.id,
          productId,
          quantity: parseInt(quantity)
        },
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      });
    }

    res.json({ message: 'Item added to cart', cartItem });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cart item quantity
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Check if cart item belongs to user
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        product: true
      }
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock
    if (cartItem.product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const updatedCartItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity: parseInt(quantity) },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    });

    res.json({ message: 'Cart item updated', cartItem: updatedCartItem });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from cart
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if cart item belongs to user
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await prisma.cartItem.delete({
      where: { id }
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear cart
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({
      where: { userId: req.user.id }
    });

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
