import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Attendance from '../models/Attendance';
import { JWT_SECRET } from '../config';
import { startOfDay, endOfDay } from 'date-fns';

interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    role?: string;
  };
}

// Generate a QR code token for a specific class
export const generateQRCode = async (req: Request, res: Response) => {
  try {
    const { classId } = req.body;
    const instructorId = (req as AuthenticatedRequest).user._id;

    console.log('Generating QR code for:', { classId, instructorId });

    if (!classId || !instructorId) {
      console.error('Missing required fields:', { classId, instructorId });
      return res.status(400).json({ 
        message: 'Class ID and instructor ID are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Generate a token that expires in 5 minutes
    const payload = {
      classId,
      instructorId,
      timestamp: new Date().toISOString(),
      type: 'attendance'
    };

    console.log('Creating token with payload:', payload);

    const token = jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    console.log('QR code token generated successfully');

    res.json({ 
      token,
      expiresIn: 300, // 5 minutes in seconds
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ 
      message: 'Error generating QR code',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Validate QR code and mark attendance
export const validateQRCode = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const studentId = (req as AuthenticatedRequest).user._id;

    console.log('Validating QR code for student:', studentId);

    if (!token || !studentId) {
      console.error('Missing required fields:', { token: !!token, studentId });
      return res.status(400).json({ 
        message: 'Token and student ID are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verify and decode the token
    console.log('Verifying token...');
    const decoded = jwt.verify(token, JWT_SECRET) as {
      classId: string;
      instructorId: string;
      timestamp: string;
      type: string;
    };

    console.log('Token decoded:', { ...decoded, token: '***' });

    if (decoded.type !== 'attendance') {
      console.error('Invalid token type:', decoded.type);
      return res.status(400).json({ 
        message: 'Invalid QR code type',
        error: 'INVALID_TOKEN_TYPE'
      });
    }

    // Check if token is not too old
    const tokenTimestamp = new Date(decoded.timestamp);
    const now = new Date();
    if (now.getTime() - tokenTimestamp.getTime() > 5 * 60 * 1000) {
      console.error('Token expired:', { tokenTimestamp, now });
      return res.status(400).json({ 
        message: 'QR code has expired',
        error: 'TOKEN_EXPIRED'
      });
    }

    // Check if attendance already exists for today
    const today = new Date();
    console.log('Checking existing attendance for:', { classId: decoded.classId, studentId, date: today });
    
    const existingAttendance = await Attendance.findOne({
      classId: decoded.classId,
      studentId,
      date: {
        $gte: startOfDay(today),
        $lte: endOfDay(today)
      }
    });

    if (existingAttendance) {
      console.log('Attendance already exists:', existingAttendance);
      return res.status(400).json({ 
        message: 'Attendance already marked for today',
        error: 'DUPLICATE_ATTENDANCE'
      });
    }

    // Create new attendance record
    console.log('Creating new attendance record...');
    const attendance = new Attendance({
      classId: decoded.classId,
      studentId,
      date: today,
      status: 'present',
      method: 'qr',
      timestamp: now
    });

    await attendance.save();
    console.log('Attendance record created successfully:', attendance);

    res.json({ 
      message: 'Attendance marked successfully',
      attendance
    });
  } catch (error) {
    console.error('Error validating QR code:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ 
        message: 'Invalid or expired QR code',
        error: 'INVALID_TOKEN'
      });
    }
    
    res.status(500).json({ 
      message: 'Error validating QR code',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 