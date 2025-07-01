import { NextApiRequest, NextApiResponse } from 'next';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: string | JwtPayload;
}

type ApiHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void>;

export const superAdminAuth = (handler: ApiHandler) => async (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return handler(req, res);
  } catch (error) {
    return res.status(401).json({ message: 'Authentication invalid' });
  }
};
