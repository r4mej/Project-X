import express from 'express';
import { generateQRCode, validateQRCode } from '../controllers/qrController';
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

export default router; 