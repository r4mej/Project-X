import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { cleanupStaleSessions, createLoginLog, createLogoutLog } from '../services/logService';

// Generate JWT token
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret', {
    expiresIn: '30d',
  });
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username });

    // Check for admin credentials
    if (username === 'admin' && password === '12345') {
      // Find or create admin user
      let adminUser = await User.findOne({ username: 'admin' });
      
      if (!adminUser) {
        // Create admin user if it doesn't exist
        // Do not hash the password here, the pre-save hook will handle it
        adminUser = await User.create({
          username: 'admin',
          email: 'admin@example.com',
          password: '12345', // Plain password, will be hashed by the pre-save hook
          role: 'admin',
          userId: 'ADMIN-001'
        });
      }

      const token = generateToken(adminUser._id);
      
      // Log admin login
      await createLoginLog(adminUser._id.toString(), req);
      
      return res.status(200).json({
        _id: adminUser._id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        userId: adminUser.userId,
        token
      });
    }

    // Find user by username - trim the username to handle spaces
    const trimmedUsername = username.trim();
    console.log('Looking for user with trimmed username:', trimmedUsername);
    
    const user = await User.findOne({ username: trimmedUsername });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    console.log('Comparing password with stored hash');
    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch ? 'Yes' : 'No');
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);
    
    // Log successful login
    await createLoginLog(user._id.toString(), req);
    
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      userId: user.userId,
      token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout user
export const logout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      console.error('No user ID found in request');
      return res.status(401).json({ message: 'Not authorized' });
    }

    console.log('Processing logout for user:', userId);

    try {
      // Log the logout action
      const logoutResult = await createLogoutLog(userId.toString(), req);
      
      if (!logoutResult) {
        console.warn('No logout log created, but proceeding with logout');
      } else {
        console.log('Logout log created successfully:', logoutResult._id);
      }
      
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (logError: any) {
      console.error('Error during logout process:', {
        error: logError,
        userId,
        message: logError.message,
        stack: logError.stack
      });
      
      // If it's a user not found error, return 401
      if (logError.message === 'User not found') {
        return res.status(401).json({ message: 'User not found' });
      }
      
      throw logError; // Re-throw for the outer catch block
    }
  } catch (error: any) {
    console.error('Unhandled error during logout:', {
      error,
      userId: req.user?._id,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: 'Server error during logout',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Run cleanup of stale sessions periodically
setInterval(cleanupStaleSessions, 60 * 60 * 1000); // Run every hour 