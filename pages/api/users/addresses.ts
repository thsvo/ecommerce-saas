import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Middleware to verify JWT token
const verifyToken = (req: NextApiRequest) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new Error('No token provided');
  }
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  return decoded.userId;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userId = verifyToken(req);

    switch (req.method) {
      case 'GET':
        return await getAddresses(req, res, userId);
      case 'POST':
        return await createAddress(req, res, userId);
      case 'PUT':
        return await updateAddress(req, res, userId);
      case 'DELETE':
        return await deleteAddress(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Address API error:', error);
    return res.status(401).json({ error: error.message || 'Unauthorized' });
  }
}

async function getAddresses(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' }
    });

    res.status(200).json({ addresses });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
}

async function createAddress(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { street, city, state, zipCode, country, isDefault } = req.body;
    
    if (!street || !city || !state || !zipCode || !country) {
      return res.status(400).json({ error: 'All address fields are required' });
    }

    // If this is set as default, unset other default addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        street,
        city,
        state,
        zipCode,
        country,
        isDefault: isDefault || false
      }
    });

    res.status(201).json({ 
      message: 'Address created successfully', 
      address 
    });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: 'Failed to create address' });
  }
}

async function updateAddress(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { addressId, street, city, state, zipCode, country, isDefault } = req.body;
    
    if (!addressId) {
      return res.status(400).json({ error: 'Address ID is required' });
    }

    // Verify address belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If this is set as default, unset other default addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.update({
      where: { id: addressId },
      data: {
        street: street || existingAddress.street,
        city: city || existingAddress.city,
        state: state || existingAddress.state,
        zipCode: zipCode || existingAddress.zipCode,
        country: country || existingAddress.country,
        isDefault: isDefault !== undefined ? isDefault : existingAddress.isDefault
      }
    });

    res.status(200).json({ 
      message: 'Address updated successfully', 
      address 
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
}

async function deleteAddress(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { addressId } = req.body;
    
    if (!addressId) {
      return res.status(400).json({ error: 'Address ID is required' });
    }

    // Verify address belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await prisma.address.delete({
      where: { id: addressId }
    });

    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
}
