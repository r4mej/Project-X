import express from 'express';
import {
  addStudent,
  deleteStudent,
  getStudentsByClass,
  updateStudent,
} from '../controllers/studentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all students for a class
router.get('/:classId', getStudentsByClass);

// Add a student
router.post('/', addStudent);

// Update a student
router.put('/:id', updateStudent);

// Delete a student
router.delete('/:id', deleteStudent);

export default router; 