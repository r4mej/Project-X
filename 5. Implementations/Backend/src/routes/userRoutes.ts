import express from 'express';
import { createUser, deleteUser, getUserById, getUsers, updateUser } from '../controllers/userController';
import { admin, protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// Admin only routes
router.route('/')
  .get(admin, getUsers)
  .post(admin, createUser);

router.route('/:id')
  .get(admin, getUserById)
  .put(admin, updateUser)
  .delete(admin, deleteUser);

export default router; 