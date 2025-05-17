import express from 'express';
import {
    bulkUpdateAttendance,
    getAttendanceByClass,
    getAttendanceByStudent,
    getStudentAttendanceStatus,
    submitAttendance
} from '../controllers/attendanceController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Test endpoint that doesn't require authentication
router.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'Attendance API is accessible',
    timestamp: new Date().toISOString()
  });
});

// Apply authentication middleware to all routes except /test
router.use((req, res, next) => {
  if (req.path === '/test') {
    return next();
  }
  authenticateToken(req, res, next);
});

// Submit attendance (student marks attendance via QR)
router.post('/', submitAttendance);

// Get all attendance records for a class
router.get('/class/:classId', getAttendanceByClass);

// Get all attendance records for a student
router.get('/student/:studentId', getAttendanceByStudent);

// Get student's status for a specific class on a specific date
router.get('/status/:classId/:studentId', getStudentAttendanceStatus);

// Bulk update attendance (for instructors)
router.post('/bulk', bulkUpdateAttendance);

export default router; 