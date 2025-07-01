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

  try {
    if (req.method === 'GET') {
      // Authenticate user for GET requests
      const authResult = await authenticateUser(req);
      if (!authResult.success) {
        return res.status(401).json({ error: authResult.error });
      }

      const userId = authResult.user.id;

      // Get user's orders
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const orders = await prisma.order.findMany({
        where: { userId: userId },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      });

      res.json(orders);
    } else if (req.method === 'POST') {
      // Handle both cart-based orders and direct buy-now orders
      const { 
        shippingAddress, 
        paymentMethod, 
        items, 
        total, 
        customerInfo,
        isDirectOrder = false 
      } = req.body;

      if (!shippingAddress || !paymentMethod) {
        return res.status(400).json({ 
          error: 'Shipping address and payment method are required' 
        });
      }

      let orderItems = [];
      let orderTotal = 0;
      let userId = null;

      if (isDirectOrder) {
        // Direct buy-now order (no authentication required)
        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ error: 'Items are required for direct orders' });
        }

        if (!customerInfo || !customerInfo.name || !customerInfo.phone) {
          return res.status(400).json({ error: 'Customer information is required' });
        }

        // Validate items and calculate total
        for (const item of items) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId }
          });

          if (!product) {
            return res.status(400).json({ 
              error: `Product with ID ${item.productId} not found` 
            });
          }

          if (product.stock < item.quantity) {
            return res.status(400).json({ 
              error: `Insufficient stock for ${product.name}` 
            });
          }

          orderItems.push({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price || product.price,
            product: product
          });

          orderTotal += (item.price || product.price) * item.quantity;
        }

        // Create guest user or use provided user ID
        if (customerInfo.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: customerInfo.email }
          });
          if (existingUser) {
            userId = existingUser.id;
          }
        }
      } else {
        // Cart-based order (requires authentication)
        const authResult = await authenticateUser(req);
        if (!authResult.success) {
          return res.status(401).json({ error: authResult.error });
        }

        userId = authResult.user.id;

        // Get user's cart items
        const cartItems = await prisma.cartItem.findMany({
          where: { userId: userId },
          include: {
            product: true
          }
        });

        if (cartItems.length === 0) {
          return res.status(400).json({ error: 'Cart is empty' });
        }

        // Check stock availability
        for (const item of cartItems) {
          if (item.product.stock < item.quantity) {
            return res.status(400).json({ 
              error: `Insufficient stock for ${item.product.name}` 
            });
          }
        }

        orderItems = cartItems.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
          product: item.product
        }));

        orderTotal = cartItems.reduce((sum: number, item: any) => {
          return sum + (item.product.price * item.quantity);
        }, 0);
      }

      // Create order with order items in a transaction
      const order = await prisma.$transaction(async (tx: any) => {
        // Create order
        const orderData: any = {
          total: total || orderTotal,
          shippingAddress,
          paymentMethod,
          status: 'PENDING',
          paymentStatus: paymentMethod === 'Cash on Delivery' ? 'PENDING' : 'PENDING'
        };

        if (userId) {
          orderData.userId = userId;
        }

        // Add customer info for direct orders
        if (isDirectOrder && customerInfo) {
          orderData.customerName = customerInfo.name;
          orderData.customerPhone = customerInfo.phone;
          orderData.customerEmail = customerInfo.email || null;
        }

        const newOrder = await tx.order.create({
          data: orderData
        });

        // Create order items and update product stock
        for (const item of orderItems) {
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }
          });

          // Update product stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });
        }

        // Clear cart only for cart-based orders
        if (!isDirectOrder && userId) {
          await tx.cartItem.deleteMany({
            where: { userId: userId }
          });
        }

        return newOrder;
      });

      // Fetch complete order data
      const completeOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          }
        }
      });

      res.status(201).json({ 
        message: 'Order created successfully', 
        order: completeOrder 
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Orders operation error:', error);
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
