import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};



const prisma = new PrismaClient();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFiles: 10,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    return new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Upload error:', err);
          res.status(500).json({ error: 'Upload failed' });
          return resolve(true);
        }

        try {
          const productId = Array.isArray(fields.productId) ? fields.productId[0] : fields.productId;
          const isMain = Array.isArray(fields.isMain) ? fields.isMain[0] : fields.isMain;
          const isNew = Array.isArray(fields.isNew) ? fields.isNew[0] : fields.isNew;
          
          // Check if files is an array
          const uploadedFiles = Array.isArray(files.files) 
            ? files.files 
            : files.files ? [files.files] : [];
          
          if (uploadedFiles.length === 0) {
            res.status(400).json({ error: 'No files uploaded' });
            return resolve(true);
          }

          const imageResults = [];

          for (const file of uploadedFiles) {
            // Generate a unique filename
            const uniqueId = uuidv4();
            const fileExt = path.extname(file.originalFilename || '');
            const newFilename = `${uniqueId}${fileExt}`;
            const finalPath = path.join(uploadDir, newFilename);

            // Move the file to the final location
            fs.renameSync(file.filepath, finalPath);

            // Create a URL-friendly path
            const imageUrl = `/uploads/${newFilename}`;

            // Handle a new product that doesn't have an ID yet
            if (isNew === 'true') {
              // For new products, we'll just return temporary IDs
              imageResults.push({
                id: `temp_${uniqueId}`,
                url: imageUrl,
                isMain: isMain === 'true' && imageResults.length === 0,
              });
            } else {
              // For existing products, save to database
              if (!productId) {
                throw new Error('productId is required for existing products');
              }
              const image: any = await prisma.productImage.create({
                data: {
                  url: imageUrl,
                  productId: productId,
                  isMain: isMain === 'true' && imageResults.length === 0, // Only make the first image main if isMain is true
                },
              });

              imageResults.push({
                id: image.id,
                url: image.url,
                isMain: image.isMain,
              });
            }
          }

          res.status(200).json({ images: imageResults });
          return resolve(true);
        } catch (error) {
          console.error('Server error:', error);
          res.status(500).json({ error: 'Server error' });
          return resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
