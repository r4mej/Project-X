import express from 'express';
import { changePassword, getCurrentUser, login, logout } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logout);
router.post('/change-password', protect, changePassword);

export default router; 