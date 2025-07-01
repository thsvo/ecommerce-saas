import { NextApiRequest, NextApiResponse } from 'next';
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Authenticate user
  const authResult = await authenticateUser(req);
  if (!authResult.success) {
    return res.status(401).json({ error: authResult.error });
  }

  const userId = authResult.user.id;

  try {
    if (req.method === 'GET') {
      // Get user's cart items
      const cartItems = await prisma.cartItem.findMany({
        where: { userId: userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              stock: true
            }
          }
        }
      });

      res.json(cartItems);
    } else if (req.method === 'POST') {
      // Add item to cart
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
      const existingCartItem = await prisma.cartItem.findFirst({
        where: {
          userId: userId,
          productId: productId
        }
      });

      let cartItem;

      if (existingCartItem) {
        // Update quantity if item exists
        const newQuantity = existingCartItem.quantity + quantity;
        
        if (newQuantity > product.stock) {
          return res.status(400).json({ error: 'Cannot add more items than available stock' });
        }

        cartItem = await prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: newQuantity },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                stock: true
              }
            }
          }
        });
      } else {
        // Create new cart item
        cartItem = await prisma.cartItem.create({
          data: {
            userId: userId,
            productId: productId,
            quantity: quantity
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                stock: true
              }
            }
          }
        });
      }

      res.status(201).json(cartItem);
    } else if (req.method === 'DELETE') {
      // Clear entire cart
      await prisma.cartItem.deleteMany({
        where: { userId: userId }
      });

      res.json({ message: 'Cart cleared' });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Cart operation error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
}

// Helper function to authenticate user
async function authenticateUser(req: NextApiRequest) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Access token required' };
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Invalid token' };
  }
}
