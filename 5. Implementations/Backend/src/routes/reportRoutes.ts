import express from 'express';
import {
    deleteReport,
    getAllReports,
    getReportsByClass,
    saveReport
} from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Save a new report
router.post('/', saveReport);

// Get reports for a specific class
router.get('/class/:classId', getReportsByClass);

// Get all reports
router.get('/', getAllReports);

// Delete a report
router.delete('/:reportId', deleteReport);

export default router; 