import { Request, Response } from 'express';
import Attendance from '../models/Attendance';
import Class from '../models/Class';
import Student from '../models/Student';

// Submit attendance record
export const submitAttendance = async (req: Request, res: Response) => {
  try {
    const { classId, studentId, studentName, timestamp, status, recordedVia, deviceInfo, ipAddress, location } = req.body;
    
    if (!classId || !studentId) {
      return res.status(400).json({ message: 'classId and studentId are required' });
    }
    
    // Check if the class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if student exists in class
    let student;
    try {
      console.log(`Attendance submission attempt: classId=${classId}, studentId=${studentId}`);
      
      student = await Student.findOne({ 
        classId, 
        studentId 
      });
      
      if (!student) {
        student = await Student.findOne({ 
          classId: classId.toString(), 
          studentId: studentId.toString() 
        });
      }
      
      if (!student) {
        return res.status(404).json({ 
          message: 'Student not found in this class', 
          details: `No student with ID ${studentId} found in class ${classId}. Verify that the student is properly enrolled in this specific class.` 
        });
      }
    } catch (error: any) {
      console.error('Error validating student:', error);
      return res.status(500).json({ 
        message: 'Error validating student in class',
        error: error.message
      });
    }
    
    // Check for existing attendance within the same day
    const today = new Date(timestamp || Date.now());
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    let attendance;
    try {
      attendance = await Attendance.findOne({
      classId,
      studentId,
      timestamp: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
      if (attendance) {
        // Store the previous status before updating
        const previousStatus = attendance.status;
        
        // Update existing record
        console.log(`Updating existing attendance record for student ${studentId} in class ${classId}`);
        console.log(`Previous status: ${previousStatus}, New status: ${status}`);
        
        attendance.status = status;
        attendance.recordedVia = recordedVia || attendance.recordedVia;
        attendance.studentName = studentName || attendance.studentName;
      
        if (deviceInfo) attendance.deviceInfo = deviceInfo;
        if (ipAddress) attendance.ipAddress = ipAddress;
        if (location) attendance.location = location;
      
        await attendance.save();
        
        // Update student's attendance stats
        if (previousStatus !== status) {
          const update: any = {
            $inc: {}
          };
          
          // Decrement the previous status count
          update.$inc[`attendanceStats.${previousStatus}`] = -1;
          // Increment the new status count
          update.$inc[`attendanceStats.${status}`] = 1;
          
          await Student.findOneAndUpdate(
            { studentId },
            update,
            { new: true }
          );
        }
        
        console.log(`Attendance record updated successfully: ${attendance._id}`);
      } else {
    // Create new attendance record
      const attendanceData = {
        classId,
        studentId,
        studentName,
        timestamp: timestamp || new Date(),
        status: status || 'present',
        recordedVia: recordedVia || 'qr',
        deviceInfo,
        ipAddress,
        location
      };
      
        console.log('Creating new attendance record with data:', JSON.stringify(attendanceData));
      
        attendance = await Attendance.create(attendanceData);
      
        // Update student's attendance stats for new record
        await Student.findOneAndUpdate(
          { studentId },
          { 
            $inc: { 
              [`attendanceStats.${status || 'present'}`]: 1
            }
          },
          { new: true }
        );
        
        console.log('Attendance record created successfully:', attendance._id);
      }
      
      // Get updated attendance stats for the class on this day
      const dayAttendance = await Attendance.find({
        classId,
        timestamp: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });
      
      const stats = {
        total: dayAttendance.length,
        present: dayAttendance.filter(a => a.status === 'present').length,
        absent: dayAttendance.filter(a => a.status === 'absent').length
      };
      
      // Get updated student stats
      const updatedStudent = await Student.findOne({ studentId });
      
      res.status(attendance ? 200 : 201).json({
        message: attendance ? 'Attendance record updated' : 'Attendance recorded successfully',
        attendance,
        stats,
        studentStats: updatedStudent?.attendanceStats
      });
      
    } catch (error: any) {
      console.error('Error processing attendance:', error);
      res.status(500).json({ 
        message: 'Error processing attendance', 
        error: error.message 
      });
    }
  } catch (error: any) {
    console.error('Error submitting attendance:', error);
    res.status(500).json({ message: 'Error submitting attendance', error: error.message });
  }
};

// Get attendance records for a class
export const getAttendanceByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;
    
    let query: any = { classId };
    
    // Filter by date if provided
    if (date) {
      const selectedDate = new Date(date as string);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      
      query.timestamp = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }
    
    const attendance = await Attendance.find(query).sort({ timestamp: -1 });
    
    // Count statistics
    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length
    };
    
    res.json({
      attendance,
      stats
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'Error fetching attendance', error });
  }
};

// Get attendance records for a student
export const getAttendanceByStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { classId, startDate, endDate } = req.query;
    
    let query: any = { studentId };
    
    // Filter by class if provided
    if (classId) {
      query.classId = classId;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.timestamp = {};
      
      if (startDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        query.timestamp.$gte = start;
      }
      
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }
    
    const attendance = await Attendance.find(query)
      .sort({ timestamp: -1 })
      .populate('classId', 'className subjectCode yearSection');
    
    // Calculate attendance statistics
    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
      presentPercentage: attendance.length > 0 
        ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) 
        : 0
    };
    
    res.json({
      attendance,
      stats
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ message: 'Error fetching student attendance', error });
  }
};

// Get student's attendance status for a specific class and date
export const getStudentAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const { classId, studentId } = req.params;
    const { date } = req.query;
    
    let queryDate: Date;
    
    if (date) {
      queryDate = new Date(date as string);
    } else {
      queryDate = new Date();
    }
    
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
    
    const attendance = await Attendance.findOne({
      classId,
      studentId,
      timestamp: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    if (!attendance) {
      return res.json({ status: 'absent' });
    }
    
    res.json({ status: attendance.status });
  } catch (error) {
    console.error('Error fetching attendance status:', error);
    res.status(500).json({ message: 'Error fetching attendance status', error });
  }
};

// Bulk update attendance records (for instructors)
export const bulkUpdateAttendance = async (req: Request, res: Response) => {
  try {
    const { classId, records, date } = req.body;
    
    if (!classId || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }
    
    // Validate class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Process date (default to today)
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);
    
    // Process each record
    const results = await Promise.all(records.map(async (record: any) => {
      const { studentId, status } = record;
      
      if (!studentId || !status) {
        return { studentId, success: false, message: 'Invalid record data' };
      }
      
      // Check if student exists in class
      // Try direct lookup first without type conversion
      let student = await Student.findOne({ classId, studentId });
      
      // If not found, try with string conversion
      if (!student) {
        student = await Student.findOne({ 
          classId: classId.toString(), 
          studentId: studentId.toString() 
        });
      }
      
      if (!student) {
        console.log(`Bulk update: Student not found - classId=${classId}, studentId=${studentId}`);
        return { studentId, success: false, message: 'Student not found in this class' };
      }
      
      try {
        // Find existing record for the day or create new one
        const existingRecord = await Attendance.findOne({
          classId,
          studentId,
          timestamp: {
            $gte: new Date(attendanceDate),
            $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
          }
        });
        
        if (existingRecord) {
          // Update existing record
          existingRecord.status = status;
          existingRecord.recordedVia = 'manual';
          await existingRecord.save();
          return { studentId, success: true, message: 'Attendance updated' };
        } else {
          // Create new record
          await Attendance.create({
            classId,
            studentId,
            timestamp: attendanceDate,
            status,
            recordedVia: 'manual'
          });
          return { studentId, success: true, message: 'Attendance recorded' };
        }
      } catch (error) {
        console.error(`Error processing student ${studentId}:`, error);
        return { studentId, success: false, message: 'Processing error' };
      }
    }));
    
    res.json({
      message: 'Bulk attendance update processed',
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Error in bulk attendance update:', error);
    res.status(500).json({ message: 'Error updating attendance', error });
  }
};

// Get all attendance records
export const getAllAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.find()
      .sort({ timestamp: -1 })
      .populate('classId', 'className subjectCode yearSection');
    
    res.json(attendance);
  } catch (error) {
    console.error('Error fetching all attendance:', error);
    res.status(500).json({ message: 'Error fetching all attendance records', error });
  }
}; 