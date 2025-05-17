import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Attendance from '../models/Attendance';
import { JWT_SECRET } from '../config';
import { startOfDay, endOfDay } from 'date-fns';
<<<<<<< HEAD
<<<<<<< HEAD
import Class, { IClass } from '../models/Class';
import Attendance from '../models/Attendance';
import { Types } from 'mongoose';
import Student from '../models/Student';
import User from '../models/User';
=======
>>>>>>> parent of 2942016 (Vibe coding)

interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
<<<<<<< HEAD
<<<<<<< HEAD
    role: string;
    userId?: string;  // Add userId for registration number
  };
}

interface QRTokenPayload {
  classId: string;
  instructorId: string;
  timestamp: string;
  type: 'attendance';
}

=======
    role?: string;
  };
}

>>>>>>> parent of 2942016 (Vibe coding)
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

    // Verify the class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        message: 'Class not found',
        error: 'CLASS_NOT_FOUND'
      });
    }

    // Generate a token that expires in 5 minutes
    const payload: QRTokenPayload = {
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
    const authUser = req as AuthenticatedRequest;
    const studentId = authUser.user.userId; // Use registration number instead of _id

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
    const decoded = jwt.verify(token, JWT_SECRET) as QRTokenPayload;

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

    // Verify the class exists
    const classDoc = await Class.findById(decoded.classId);
    if (!classDoc) {
      return res.status(404).json({
        message: 'Class not found',
        error: 'CLASS_NOT_FOUND'
      });
    }

    // Verify student is enrolled in the class
    const enrollment = await Student.findOne({
      classId: decoded.classId,
      studentId // Using registration number
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'Student is not enrolled in this class',
        error: 'NOT_ENROLLED'
      });
    }

    // Check if attendance already exists for today
    const today = new Date();
    console.log('Checking existing attendance for:', { classId: decoded.classId, studentId, date: today });
    
    const existingAttendance = await Attendance.findOne({
      classId: decoded.classId,
      studentId, // Using registration number
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
      studentId, // Using registration number
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
<<<<<<< HEAD
<<<<<<< HEAD
};

// Mark attendance using student QR code
export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { classId, studentId, timestamp } = req.body;
    const instructorId = (req as AuthenticatedRequest).user._id;
    const userRole = (req as AuthenticatedRequest).user.role;

    console.log('Marking attendance:', { classId, studentId, timestamp, instructorId, userRole });

    if (!classId || !studentId || !timestamp) {
      console.error('Missing required fields:', { classId, studentId, timestamp });
      return res.status(400).json({ 
        message: 'Class ID, student ID, and timestamp are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verify that the class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        message: 'Class not found',
        error: 'CLASS_NOT_FOUND'
      });
    }

    // Check if student is enrolled in the class using registration number
    const student = await Student.findOne({ 
      classId, 
      studentId  // Using registration number
    });
    
    if (!student) {
      console.error('Student not enrolled in class:', { studentId, classId });
      return res.status(404).json({
        message: 'Student is not enrolled in this class',
        error: 'STUDENT_NOT_ENROLLED'
      });
    }

    // Check if the user is the instructor of this class or an admin
    if (userRole !== 'admin' && userRole !== 'instructor') {
      console.error('Unauthorized role:', { userRole });
      return res.status(403).json({
        message: 'Only instructors and admins can mark attendance',
        error: 'UNAUTHORIZED_ROLE'
      });
    }

    // Check if attendance already exists for today
    const today = new Date(timestamp);
    const existingAttendance = await Attendance.findOne({
      classId,
      studentId, // Using registration number
      date: {
        $gte: startOfDay(today),
        $lte: endOfDay(today)
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: 'Attendance already marked for today',
        error: 'DUPLICATE_ATTENDANCE'
      });
    }

    // Create new attendance record
    const attendance = new Attendance({
      classId,
      studentId, // Using registration number
      date: today,
      status: 'present',
      method: 'qr',
      timestamp: today
    });

    await attendance.save();

    res.json({
      message: 'Attendance marked successfully',
      attendance
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      message: 'Error marking attendance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
=======
>>>>>>> parent of 2942016 (Vibe coding)
}; 