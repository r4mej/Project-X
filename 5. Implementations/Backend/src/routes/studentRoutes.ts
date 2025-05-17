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

<<<<<<< HEAD
// Student dashboard endpoints (more specific routes first)
router.get('/:studentId/classes/today', getTodayClasses);
router.get('/:studentId/attendance/overview', getAttendanceOverview);
router.get('/:studentId/attendance/today', getTodayStatus);

// CRUD operations
router.post('/', addStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);
router.delete('/:studentId/class/:classId', deleteStudent);

// Get all students for a class (less specific route last)
=======
// Get all students for a class
>>>>>>> parent of 2942016 (Vibe coding)
router.get('/:classId', getStudentsByClass);

// Add a student
router.post('/', addStudent);

// Update a student
router.put('/:id', updateStudent);

// Delete a student
router.delete('/:id', deleteStudent);

export default router; 