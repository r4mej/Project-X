import express from 'express';
import { generateQRCode, validateQRCode, markAttendance } from '../controllers/qrController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Test endpoint for QR API connectivity
router.get('/test', (req, res) => {
  res.status(200).json({
    message: 'QR API is accessible',
    timestamp: new Date().toISOString()
  });
});

// Route to generate QR code (instructor only)
router.post('/generate', authenticateToken, generateQRCode);

// Route to validate QR code and mark attendance (student only)
router.post('/validate', authenticateToken, validateQRCode);

// Route to mark attendance using student QR code
router.post('/mark-attendance', authenticateToken, markAttendance);

export default router; 