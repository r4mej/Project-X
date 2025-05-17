import { Request, Response } from 'express';
import Student, { IStudent } from '../models/Student';
import Class, { IClass, ITimeSlot } from '../models/Class';
import Attendance from '../models/Attendance';
import { startOfDay, endOfDay } from 'date-fns';

export const getStudentsByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const students = await Student.find({ classId });
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students', error });
  }
};

export const addStudent = async (req: Request, res: Response) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ message: 'Error adding student', error });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndUpdate(id, req.body, { new: true });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: 'Error updating student', error });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Error deleting student', error });
  }
};

export const getTodayClasses = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
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

    const student = await Student.find({ studentId });
    const classIds = student.map(s => s.classId);

    const classes = await Class.find({
      _id: { $in: classIds },
      'schedules.days': dayMap[dayOfWeek]
    }).populate({
      path: 'instructor',
      select: 'username'
    });

    const formattedClasses = classes.map(cls => {
      const scheduleForToday = cls.schedules.find(s => s.days.includes(dayMap[dayOfWeek]));
      const instructorDoc = cls.get('instructor');
      return {
        _id: cls._id,
        className: cls.className,
        classTime: scheduleForToday 
          ? `${scheduleForToday.startTime}${scheduleForToday.startPeriod} - ${scheduleForToday.endTime}${scheduleForToday.endPeriod}` 
          : 'N/A',
        instructor: instructorDoc ? instructorDoc.username : 'Unknown',
        status: 'pending'
      };
    });

    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const attendanceRecords = await Attendance.find({
      classId: { $in: classIds },
      studentId: studentId,
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
    const { studentId } = req.params;
    
    const allAttendance = await Attendance.find({ studentId });
    
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
    const { studentId } = req.params;
    const today = new Date();
    
    const todayAttendance = await Attendance.findOne({
      studentId,
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