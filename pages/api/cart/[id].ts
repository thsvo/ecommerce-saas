import { NextApiRequest, NextApiResponse } from 'next';
const express = require('express');
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

  const { id } = req.query;
  const userId = authResult.user.id;

  try {
    if (req.method === 'PUT') {
      // Update cart item quantity
      const { quantity } = req.body;

      if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Valid quantity is required' });
      }

      // Check if cart item exists and belongs to user
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: id,
          userId: userId
        },
        include: { product: true }
      });

      if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
      }

      // Check stock availability
      if (quantity > cartItem.product.stock) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      const updatedCartItem = await prisma.cartItem.update({
        where: { id: id },
        data: { quantity: quantity },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              stock: true
            }
          }
        }
      });

      res.json(updatedCartItem);
    } else if (req.method === 'DELETE') {
      // Remove item from cart
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: id,
          userId: userId
        }
      });

      if (!cartItem) {
        return res.status(404).json({ error: 'Cart item not found' });
      }

      await prisma.cartItem.delete({
        where: { id: id }
      });

      res.json({ message: 'Item removed from cart' });
    } else {
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Cart item operation error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
