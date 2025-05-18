import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import User from '../models/User';

interface UserPayload {
  id: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user: UserPayload;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth middleware - Request URL:', req.url);
  console.log('Auth middleware - Headers:', JSON.stringify(req.headers));
  console.log('Auth middleware - Token present:', token ? 'Yes' : 'No');

  if (!token) {
    console.log('Auth middleware - No authentication token provided');
    return res.status(401).json({ message: 'No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    (req as AuthenticatedRequest).user = decoded;
    console.log('Auth middleware - Token verified successfully. User:', decoded.id);
    next();
  } catch (err) {
    console.error('Auth middleware - Token verification failed:', err);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as any;
    
    // Find user by id
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
}; 