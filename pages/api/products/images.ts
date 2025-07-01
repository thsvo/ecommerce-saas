import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { productId } = req.query;

  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get all images for a product
        const images = await prisma.productImage.findMany({
          where: { productId },
          orderBy: { isMain: 'desc' },
        });

        return res.status(200).json({ images });

      case 'DELETE':
        // Delete a specific image
        const { imageId } = req.query;
        
        if (!imageId || typeof imageId !== 'string') {
          return res.status(400).json({ error: 'Image ID is required' });
        }

        // Get the image data to remove the file
        const image = await prisma.productImage.findUnique({
          where: { id: imageId },
        });

        if (!image) {
          return res.status(404).json({ error: 'Image not found' });
        }

        // Delete from database
        await prisma.productImage.delete({
          where: { id: imageId },
        });

        // Delete the file from the file system
        try {
          const filePath = path.join(process.cwd(), 'public', image.url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
          // Continue even if file deletion fails
        }

        return res.status(200).json({ message: 'Image deleted successfully' });

      case 'PUT':
        // Set a specific image as main
        const { imageId: mainImageId } = req.body;
        
        if (!mainImageId) {
          return res.status(400).json({ error: 'Image ID is required' });
        }

        // Reset all images for this product to not main
        await prisma.productImage.updateMany({
          where: { productId },
          data: { isMain: false },
        });

        // Set the specified image as main
        await prisma.productImage.update({
          where: { id: mainImageId },
          data: { isMain: true },
        });

        return res.status(200).json({ message: 'Main image updated successfully' });

      default:
        res.setHeader('Allow', ['GET', 'DELETE', 'PUT']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Product Images API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
