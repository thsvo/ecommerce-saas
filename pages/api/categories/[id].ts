import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { withSubdomainCheck } from '@/middleware/subdomainCheck';

const prisma = new PrismaClient();

interface ExtendedNextApiRequest extends NextApiRequest {
  subdomain?: string;
  adminId?: string;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'categories');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
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

const uploadSingle = promisify(upload.single('image'));

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const where: any = { id };
        
        // If there's a subdomain, also filter by admin ID
        if (req.adminId) {
          where.createdBy = req.adminId;
        }
        
        const category = await prisma.category.findUnique({
          where,
          include: {
            products: {
              where: req.adminId ? { createdBy: req.adminId } : {}
            }
          }
        });

        if (!category) {
          return res.status(404).json({ error: 'Category not found' });
        }

        res.status(200).json(category);
        break;

      case 'PUT':
        try {
          // Handle file upload
          await uploadSingle(req as any, res as any);
          
          const { name, description } = req.body;
          
          // Get existing category to handle old image deletion
          const existingCategory = await prisma.category.findUnique({
            where: { id }
          });
          
          if (!existingCategory) {
            return res.status(404).json({ error: 'Category not found' });
          }
          
          let imagePath = existingCategory.image;
          
          // Handle new image upload
          if ((req as any).file) {
            imagePath = `/uploads/categories/${(req as any).file.filename}`;
            
            // Delete old image if it exists
            if (existingCategory.image) {
              const oldImagePath = path.join(process.cwd(), 'public', existingCategory.image);
              if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
              }
            }
          }
          
          const updatedCategory = await prisma.category.update({
            where: { id },
            data: {
              ...(name && { name }),
              ...(description !== undefined && { description }),
              image: imagePath
            }
          });

          res.status(200).json(updatedCategory);
        } catch (error) {
          console.error('Category update error:', error);
          res.status(500).json({ error: 'Failed to update category' });
        }
        break;

      case 'DELETE':
        // Check if category has products
        const productsCount = await prisma.product.count({
          where: { categoryId: id }
        });

        if (productsCount > 0) {
          return res.status(400).json({ 
            error: 'Cannot delete category with existing products' 
          });
        }

      case 'DELETE':
        // For subdomain requests, ensure the category belongs to the admin
        const deleteWhere: any = { id };
        if (req.adminId) {
          deleteWhere.createdBy = req.adminId;
        }
        
        const categoryToDelete = await prisma.category.findUnique({
          where: deleteWhere
        });
        
        if (!categoryToDelete) {
          return res.status(404).json({ error: 'Category not found or access denied' });
        }

        await prisma.category.delete({
          where: { id }
        });

        res.status(200).json({ message: 'Category deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Category API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withSubdomainCheck(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
