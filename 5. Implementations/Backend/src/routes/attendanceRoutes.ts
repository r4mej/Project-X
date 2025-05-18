import express from 'express';
import {
  bulkUpdateAttendance,
  getAllAttendance,
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

// Protected routes
router.use(authenticateToken);

// Submit attendance
router.post('/', submitAttendance);

// Get all attendance records
router.get('/all', getAllAttendance);

// Get all attendance records for a class
router.get('/class/:classId', getAttendanceByClass);

// Get all attendance records for a student
router.get('/student/:studentId', getAttendanceByStudent);

// Get student's attendance status
router.get('/status/:classId/:studentId', getStudentAttendanceStatus);

// Bulk update attendance
router.post('/bulk', bulkUpdateAttendance);

export default router; 