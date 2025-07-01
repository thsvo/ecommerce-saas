import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends NextApiRequest {
  user?: any;
}

const authenticateAdmin = (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;
    
    console.log('Token received:', token ? 'Token present' : 'No token');
    console.log('Headers:', req.headers.authorization);
    console.log('Cookies:', req.cookies.token);
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    console.log('Decoded token:', decoded);
    
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = decoded;
    return true;
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  console.log('Auth test endpoint called');
  
  const authResult = authenticateAdmin(req, res);
  if (authResult !== true) return;

  return res.status(200).json({ 
    message: 'Authentication successful',
    user: req.user
  });
}
