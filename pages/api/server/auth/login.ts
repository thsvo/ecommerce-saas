import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { withSubdomainCheck } from '@/middleware/subdomainCheck';

const prisma = new PrismaClient();

interface ExtendedNextApiRequest extends NextApiRequest {
  subdomain?: string;
  adminId?: string;
}

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Enhanced debug logging
    console.log('=== LOGIN DEBUG ===');
    console.log('- User email:', user.email);
    console.log('- User role:', user.role);
    console.log('- User subdomain:', user.subdomain);
    console.log('- Request subdomain (from req.subdomain):', req.subdomain);
    console.log('- Request host:', req.headers.host);
    console.log('- Request x-subdomain header:', req.headers['x-subdomain']);
    console.log('- Request adminId:', req.adminId);
    console.log('- Request path:', req.url);
    console.log('- All headers:', JSON.stringify(req.headers, null, 2));
    console.log('===================')

    // For admin users, check if they belong to the current subdomain
    if (user.role === 'ADMIN' && req.subdomain) {
      if (user.subdomain !== req.subdomain) {
        res.status(401).json({ 
          error: 'Access denied: This admin account does not belong to this store',
          message: `This admin account belongs to "${user.subdomain}" but you're trying to access "${req.subdomain}"`
        });
        return;
      }
    }

    // For admin users trying to login to main site (no subdomain), deny access
    if (user.role === 'ADMIN' && !req.subdomain) {
      res.status(401).json({ 
        error: 'Admin access denied: Please login through your store subdomain',
        message: `Please visit ${user.subdomain}.codeopx.com to access your admin panel`
      });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        subdomain: user.subdomain
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withSubdomainCheck(handler);