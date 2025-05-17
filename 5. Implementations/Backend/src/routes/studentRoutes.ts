import express from 'express';
import {
  addStudent,
  deleteStudent,
  getStudentsByClass,
  updateStudent,
  getTodayClasses,
  getAttendanceOverview,
  getTodayStatus
} from '../controllers/studentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Student dashboard endpoints (more specific routes first)
router.get('/:studentId/classes/today', getTodayClasses);
router.get('/:studentId/attendance/overview', getAttendanceOverview);
router.get('/:studentId/attendance/today', getTodayStatus);

// CRUD operations
router.post('/', addStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

// Get all students for a class (less specific route last)
router.get('/:classId', getStudentsByClass);

export default router; 