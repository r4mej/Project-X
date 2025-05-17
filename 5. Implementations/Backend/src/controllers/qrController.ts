import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { JWT_SECRET } from '../config';
import { startOfDay, endOfDay } from 'date-fns';
import Class from '../models/Class';
import Attendance from '../models/Attendance';
import { Types } from 'mongoose';
import Student from '../models/Student';

interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    role: string;
  };
}

interface IClass {
  _id: Types.ObjectId;
  instructorId: Types.ObjectId;
  className: string;
  subjectCode: string;
  yearSection: string;
  schedules: Array<{
    day: string;
    startTime: string;
    endTime: string;
    startPeriod: string;
    endPeriod: string;
  }>;
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
    const classDoc = await Class.findOne({ _id: classId }).lean() as IClass;
    if (!classDoc) {
      return res.status(404).json({
        message: 'Class not found',
        error: 'CLASS_NOT_FOUND'
      });
    }

    // Check if student is enrolled in the class
    const student = await Student.findOne({ classId, studentId });
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

    if (userRole === 'instructor' && classDoc.instructorId.toString() !== instructorId) {
      console.error('Unauthorized access:', { 
        instructorId, 
        classInstructorId: classDoc.instructorId,
        userRole
      });
      return res.status(403).json({
        message: 'You do not have permission to mark attendance for this class',
        error: 'UNAUTHORIZED'
      });
    }

    // Check if attendance already exists for today
    const today = new Date(timestamp);
    const existingAttendance = await Attendance.findOne({
      classId,
      studentId,
      date: {
        $gte: startOfDay(today),
        $lte: endOfDay(today)
      }
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = 'present';
      existingAttendance.timestamp = new Date(timestamp);
      await existingAttendance.save();

      console.log('Attendance updated successfully:', existingAttendance);

      return res.json({ 
        message: 'Attendance updated successfully',
        attendance: existingAttendance
      });
    }

    // Create new attendance record
    const attendance = new Attendance({
      classId,
      studentId,
      date: today,
      status: 'present',
      method: 'qr',
      timestamp: new Date(timestamp)
    });

    await attendance.save();
    console.log('Attendance marked successfully:', attendance);

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
}; 