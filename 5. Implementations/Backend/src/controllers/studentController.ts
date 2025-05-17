import { Request, Response } from 'express';
import Student, { IStudent } from '../models/Student';
import Class, { IClass, ITimeSlot } from '../models/Class';
import Attendance from '../models/Attendance';
import { startOfDay, endOfDay } from 'date-fns';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';
import { Document } from 'mongoose';
import { MongoError } from 'mongodb';
import mongoose from 'mongoose';

interface IUser extends Document {
  _id: string;
  userId: string;
  email: string;
  role: string;
  surname?: string;
  firstName?: string;
  middleInitial?: string;
}

export const getStudentsByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    
    // Find students
    const students = await Student.find({ classId })
      .lean()
      .exec();

    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students', error });
  }
};

export const addStudent = async (req: Request, res: Response) => {
  try {
    const { classId, studentId, username } = req.body;

    // Validate required fields
    if (!classId || !studentId || !username) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if user exists with this studentId
    const existingUser = await User.findOne({ userId: studentId });
    if (!existingUser) {
      return res.status(404).json({
        message: 'Student not found in the system. Please ensure the student is registered as a user first.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check if student is already enrolled in this class
    const existingEnrollment = await Student.findOne({
      classes: classId,
      studentId: studentId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        message: 'Student is already enrolled in this class',
        error: 'DUPLICATE_ENROLLMENT'
      });
    }

    // Create or update student record
    let student = await Student.findOne({ studentId });
    
    if (student) {
      // Update existing student
      student.classes = [...student.classes, new mongoose.Types.ObjectId(classId)];
      await student.save();
    } else {
      // Create new student
      student = await Student.create({
        studentId,
        username,
        user: existingUser._id,
        classes: [classId]
      });
    }

    res.status(201).json({
      message: 'Student added successfully',
      student: {
        _id: student._id,
        studentId: student.studentId,
        username: student.username,
        classes: student.classes
      }
    });

  } catch (error: any) {
    console.error('Error in addStudent:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Student is already enrolled in this class',
        error: 'DUPLICATE_ENROLLMENT'
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { studentId, username } = req.body;

    // Validate required fields
    if (!studentId || !username) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find and update student
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.username = username;
    await student.save();

    res.status(200).json({
      message: 'Student updated successfully',
      student: {
        _id: student._id,
        studentId: student.studentId,
        username: student.username,
        classes: student.classes
      }
    });

  } catch (error: any) {
    console.error('Error in updateStudent:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id, studentId, classId } = req.params;  // Get all possible params from URL

    let deletedStudent: IStudent | null = null;

    if (id) {
      // If MongoDB _id is provided (legacy route)
      deletedStudent = await Student.findByIdAndDelete(id).lean();
    } else if (studentId && classId) {
      // If studentId (registration number) and classId are provided
      deletedStudent = await Student.findOneAndDelete({ 
        studentId,
        classId 
      }).lean();
    } else {
      return res.status(400).json({ 
        message: 'Invalid request: missing required parameters' 
      });
    }

    if (!deletedStudent) {
      return res.status(404).json({ message: 'Student not found in this class' });
    }

    // Also delete any associated attendance records
    await Attendance.deleteMany({ 
      studentId: deletedStudent.studentId,
      classId: deletedStudent.classId
    });

    res.json({ 
      message: 'Student dropped successfully',
      student: deletedStudent
    });
  } catch (error) {
    console.error('Error dropping student:', error);
    res.status(500).json({ message: 'Error dropping student', error });
  }
};

export const getTodayClasses = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayMap: { [key: number]: string } = {
      0: 'SU',
      1: 'M',
      2: 'T',
      3: 'W',
      4: 'TH',
      5: 'F',
      6: 'S'
    };

    // Find all class enrollments for this student using their MongoDB _id
    const studentEnrollments = await Student.find({ 
      studentId: userId  // Using the MongoDB _id from the authenticated user
    });
    
    const classIds = studentEnrollments.map(s => s.classId);

    const classes = await Class.find({
      _id: { $in: classIds },
      'schedules.days': dayMap[dayOfWeek]
    }).populate('instructor', 'username');

    const formattedClasses = classes.map(cls => {
      const scheduleForToday = cls.schedules.find(s => s.days.includes(dayMap[dayOfWeek]));
      const instructorDoc = cls.instructor as unknown as { username: string } | null;
      return {
        _id: cls._id,
        className: cls.className,
        classTime: scheduleForToday 
          ? `${scheduleForToday.startTime}${scheduleForToday.startPeriod} - ${scheduleForToday.endTime}${scheduleForToday.endPeriod}` 
          : 'N/A',
        instructor: instructorDoc?.username || 'Unknown',
        status: 'pending'
      };
    });

    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const attendanceRecords = await Attendance.find({
      classId: { $in: classIds },
      studentId: userId,  // Using the MongoDB _id from the authenticated user
      timestamp: {
        $gte: todayStart,
        $lte: todayEnd
      }
    });

    formattedClasses.forEach(cls => {
      const attendance = attendanceRecords.find(a => a.classId.toString() === cls._id.toString());
      if (attendance) {
        cls.status = attendance.status;
      }
    });

    res.json(formattedClasses);
  } catch (error) {
    console.error('Error fetching today\'s classes:', error);
    res.status(500).json({ message: 'Error fetching today\'s classes', error });
  }
};

export const getAttendanceOverview = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    
    const allAttendance = await Attendance.find({ studentId: userId });
    
    const overall = allAttendance.length > 0
      ? Math.round((allAttendance.filter(a => a.status === 'present').length / allAttendance.length) * 100)
      : 0;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const isSecondSemester = currentMonth >= 6;

    const currentSemesterStart = new Date(currentYear, isSecondSemester ? 6 : 0, 1);
    const currentSemesterEnd = new Date(currentYear, isSecondSemester ? 11 : 5, 31);
    const lastSemesterStart = new Date(currentYear - (isSecondSemester ? 0 : 1), isSecondSemester ? 0 : 6, 1);
    const lastSemesterEnd = new Date(currentYear - (isSecondSemester ? 0 : 1), isSecondSemester ? 5 : 11, 31);

    const currentSemesterAttendance = allAttendance.filter(a => 
      a.timestamp >= currentSemesterStart && a.timestamp <= currentSemesterEnd
    );
    const currentSemester = currentSemesterAttendance.length > 0
      ? Math.round((currentSemesterAttendance.filter(a => a.status === 'present').length / currentSemesterAttendance.length) * 100)
      : 0;

    const lastSemesterAttendance = allAttendance.filter(a =>
      a.timestamp >= lastSemesterStart && a.timestamp <= lastSemesterEnd
    );
    const lastSemester = lastSemesterAttendance.length > 0
      ? Math.round((lastSemesterAttendance.filter(a => a.status === 'present').length / lastSemesterAttendance.length) * 100)
      : 0;

    res.json({
      overall,
      currentSemester,
      lastSemester
    });
  } catch (error) {
    console.error('Error fetching attendance overview:', error);
    res.status(500).json({ message: 'Error fetching attendance overview', error });
  }
};

export const getTodayStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const today = new Date();
    
    const todayAttendance = await Attendance.findOne({
      studentId: userId,  // Using the MongoDB _id from the authenticated user
      timestamp: {
        $gte: startOfDay(today),
        $lte: endOfDay(today)
      }
    }).sort({ timestamp: -1 });

    if (!todayAttendance) {
      return res.json({
        status: 'absent',
        lastCheckIn: null
      });
    }

    res.json({
      status: todayAttendance.status,
      lastCheckIn: todayAttendance.timestamp ? {
        time: todayAttendance.timestamp.toLocaleTimeString(),
        method: todayAttendance.method,
        location: todayAttendance.location 
          ? `${todayAttendance.location.latitude}, ${todayAttendance.location.longitude}`
          : 'Not available'
      } : null
    });
  } catch (error) {
    console.error('Error fetching today\'s status:', error);
    res.status(500).json({ message: 'Error fetching today\'s status', error });
  }
};

export const getStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findOne({ studentId })
      .populate('classes')
      .populate('user', '-password');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json(student);
  } catch (error: any) {
    console.error('Error in getStudent:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const removeStudent = async (req: Request, res: Response) => {
  try {
    const { classId, studentId } = req.params;

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove the class from the student's classes array
    student.classes = student.classes.filter(id => id.toString() !== classId);
    await student.save();

    res.status(200).json({
      message: 'Student removed from class successfully',
      student: {
        _id: student._id,
        studentId: student.studentId,
        username: student.username,
        classes: student.classes
      }
    });

  } catch (error: any) {
    console.error('Error in removeStudent:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 