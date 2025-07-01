import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { extractSubdomain } from '@/lib/subdomainUtils';

const prisma = new PrismaClient();

type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

interface ExtendedNextApiRequest extends NextApiRequest {
  subdomain?: string;
  adminId?: string;
}

/**
 * Middleware to check if the request is coming from a valid admin subdomain
 * and attach the subdomain and admin information to the request object
 */
export function withSubdomainCheck(handler: NextApiHandler) {
  return async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
    // Get subdomain from header (set by Edge middleware) or extract from host
    let subdomain = req.headers['x-subdomain'] as string;
    
    if (!subdomain) {
      // Fallback: extract subdomain from host header
      const host = req.headers.host || '';
      const extractedSubdomain = extractSubdomain(host);
      if (extractedSubdomain) {
        subdomain = extractedSubdomain;
      }
    }
    
    if (subdomain) {
      try {
        // Find user with this subdomain
        const user = await prisma.user.findUnique({
          where: { subdomain },
          select: { id: true, role: true }
        });

        if (user && user.role === 'ADMIN') {
          // Attach subdomain and admin info to request
          req.subdomain = subdomain;
          req.adminId = user.id;
        }
      } catch (error) {
        console.error('Error checking subdomain:', error);
      }
    }

    // Continue to the API handler
    return handler(req, res);
  };
}

/**
 * Middleware that requires a valid admin subdomain to access the API
 */
export function requireSubdomain(handler: NextApiHandler) {
  return async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
    // Get subdomain from header (set by Edge middleware)
    const subdomain = req.headers['x-subdomain'] as string;
    
    if (!subdomain) {
      return res.status(403).json({ message: 'Access denied: No subdomain provided' });
    }

    try {
      // Find user with this subdomain
      const user = await prisma.user.findUnique({
        where: { subdomain },
        select: { id: true, role: true }
      });

      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied: Invalid subdomain' });
      }

      // Attach subdomain and admin info to request
      req.subdomain = subdomain;
      req.adminId = user.id;

      // Continue to the API handler
      return handler(req, res);
    } catch (error) {
      console.error('Error checking subdomain:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}