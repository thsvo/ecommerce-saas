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
  try {
    switch (req.method) {
      case 'GET':
        const { page = 1, limit = 10, search, adminId } = req.query;
        
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        
        const where: any = {};
        
        // If there's a subdomain or adminId filter, add it to the where clause
        if (req.adminId || adminId) {
          where.createdBy = req.adminId || adminId;
        }
        
        if (search) {
          where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } }
          ];
        }
        
        const [categories, total] = await Promise.all([
          prisma.category.findMany({
            where,
            skip,
            take,
            include: {
              products: {
                select: {
                  id: true
                },
                where: req.adminId ? { createdBy: req.adminId } : {}
              }
            },
            orderBy: { createdAt: 'desc' }
          }),
          prisma.category.count({ where })
        ]);
        
        const categoriesWithProductCount = categories.map(category => ({
          ...category,
          productCount: category.products.length
        }));
        
        res.status(200).json({
          categories: categoriesWithProductCount,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / take),
            totalItems: total,
            hasNext: skip + take < total,
            hasPrev: Number(page) > 1
          }
        });
        break;
        
      case 'POST':
        try {
          // Handle file upload
          await uploadSingle(req as any, res as any);
          
          const { name, description } = req.body;
          
          if (!name) {
            return res.status(400).json({ error: 'Name is required' });
          }
          
          let imagePath = '';
          if ((req as any).file) {
            imagePath = `/uploads/categories/${(req as any).file.filename}`;
          }
          
          // For subdomain requests, set the createdBy to the admin ID
          const categoryData: any = {
            name,
            description: description || '',
            image: imagePath
          };
          
          if (req.adminId) {
            categoryData.createdBy = req.adminId;
          }
          
          const newCategory = await prisma.category.create({
            data: categoryData
          });
          
          res.status(201).json(newCategory);
        } catch (error) {
          console.error('Category creation error:', error);
          res.status(500).json({ error: 'Failed to create category' });
        }
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Categories API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withSubdomainCheck(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
