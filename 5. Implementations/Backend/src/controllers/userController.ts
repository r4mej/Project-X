import { Request, Response } from 'express';
import User from '../models/User';

// Get all users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new user (admin only)
export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, email, role, userId, fullName } = req.body;
    console.log('Creating user with data:', { username, email, role, userId });
    
    // Validate user ID format based on role
    if (role === 'student' && !/^\d{4}-\d{4}$/.test(userId)) {
      return res.status(400).json({ message: 'Invalid student ID format. Use format: YYYY-XXXX' });
    }
    
    if (role === 'instructor' && !/^T-\d{4}$/.test(userId)) {
      return res.status(400).json({ message: 'Invalid instructor ID format. Use format: T-YYYY' });
    }
    
    if (role === 'admin' && !/^ADMIN-\d{3}$/.test(userId)) {
      return res.status(400).json({ message: 'Invalid admin ID format. Use format: ADMIN-XXX' });
    }
    
    // Check for duplicates individually
    const duplicateChecks = await Promise.all([
      User.findOne({ email: email.trim().toLowerCase() }),
      User.findOne({ username: username.trim() }),
      User.findOne({ userId: userId.trim() })
    ]);

    const duplicateFields = [];
    if (duplicateChecks[0]) duplicateFields.push('email');
    if (duplicateChecks[1]) duplicateFields.push('username');
    if (duplicateChecks[2]) duplicateFields.push('user ID');

    if (duplicateFields.length > 0) {
      return res.status(400).json({
        message: `The following fields are already in use: ${duplicateFields.join(', ')}`,
        duplicates: duplicateFields
      });
    }
    
    // Use userId as password - do not hash it here, the pre-save hook will handle it
    const password = userId;
    
    // Create user - password will be hashed by the pre-save hook
    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password, // Plain password, will be hashed by the pre-save hook
      role,
      userId: userId.trim()
    });
    
    console.log('User created successfully:', {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      userId: user.userId
    });
    
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      userId: user.userId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user (admin only)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { username, email, role, userId, fullName } = req.body;
    
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate user ID format based on role
    if (role === 'student' && !/^\d{4}-\d{4}$/.test(userId)) {
      return res.status(400).json({ message: 'Invalid student ID format. Use format: YYYY-XXXX' });
    }
    
    if (role === 'instructor' && !/^T-\d{4}$/.test(userId)) {
      return res.status(400).json({ message: 'Invalid instructor ID format. Use format: T-YYYY' });
    }
    
    if (role === 'admin' && !/^ADMIN-\d{3}$/.test(userId)) {
      return res.status(400).json({ message: 'Invalid admin ID format. Use format: ADMIN-XXX' });
    }
    
    // Check for duplicates individually, excluding the current user
    const duplicateChecks = await Promise.all([
      User.findOne({ 
        _id: { $ne: req.params.id },
        email: email.trim().toLowerCase()
      }),
      User.findOne({ 
        _id: { $ne: req.params.id },
        username: username.trim()
      }),
      User.findOne({ 
        _id: { $ne: req.params.id },
        userId: userId.trim()
      })
    ]);

    const duplicateFields = [];
    if (duplicateChecks[0]) duplicateFields.push('email');
    if (duplicateChecks[1]) duplicateFields.push('username');
    if (duplicateChecks[2]) duplicateFields.push('user ID');

    if (duplicateFields.length > 0) {
      return res.status(400).json({
        message: `The following fields are already in use: ${duplicateFields.join(', ')}`,
        duplicates: duplicateFields
      });
    }
    
    // Update user
    user.username = username || user.username;
    user.email = email || user.email;
    user.role = role || user.role;
    
    // If userId is changed, update password to match new userId
    if (userId && userId !== user.userId) {
      user.userId = userId;
      user.password = userId; // Plain password, will be hashed by the pre-save hook
    }
    
    await user.save();
    
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      userId: user.userId
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get the requesting user's ID from the request body
    const requestingUserId = req.body.requestingUserId;
    if (!requestingUserId) {
      return res.status(400).json({ message: 'Requesting user ID is required' });
    }

    // Find the requesting user
    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) {
      return res.status(404).json({ message: 'Requesting user not found' });
    }

    // Prevent users from deleting themselves
    if (req.params.id === requestingUserId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Protect ADMIN-001 from deletion
    if (user.userId === 'ADMIN-001') {
      return res.status(400).json({ message: 'Cannot delete the root admin account (ADMIN-001)' });
    }
    
    // Use deleteOne instead of remove
    await User.deleteOne({ _id: req.params.id });
    
    res.status(200).json({ message: 'User removed' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 