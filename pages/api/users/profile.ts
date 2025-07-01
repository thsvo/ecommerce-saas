import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const uploadSingle = promisify(upload.single('avatar'));

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
        return await getProfile(req, res, userId);
      case 'PUT':
        return await updateProfile(req, res, userId);
      case 'DELETE':
        return await deleteAccount(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Profile API error:', error);
    return res.status(401).json({ error: error.message || 'Unauthorized' });
  }
}

async function getProfile(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        dateOfBirth: true,
        createdAt: true,
        addresses: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            isDefault: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

async function updateProfile(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    // Handle file upload if present
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      await uploadSingle(req as any, res as any);
    }

    const { firstName, lastName, email, phone, dateOfBirth, currentPassword, newPassword } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });
      
      if (emailExists) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);

    // Handle avatar upload
    if ((req as any).file) {
      updateData.avatar = `/uploads/avatars/${(req as any).file.filename}`;
      
      // Delete old avatar if exists
      if (existingUser.avatar) {
        const oldAvatarPath = path.join(process.cwd(), 'public', existingUser.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      
      const passwordMatch = await bcrypt.compare(currentPassword, existingUser.password);
      if (!passwordMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        dateOfBirth: true,
        createdAt: true
      }
    });

    res.status(200).json({ 
      message: 'Profile updated successfully', 
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

async function deleteAccount(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { password } = req.body;
    
    // Verify password before deletion
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    // Delete user avatar if exists
    if (user.avatar) {
      const avatarPath = path.join(process.cwd(), 'public', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Delete user account (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
