import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Report from '../models/Report';

// Save a new attendance report
export const saveReport = async (req: Request, res: Response) => {
  try {
    const {
      date,
      className,
      subjectCode,
      classId,
      totalStudents,
      presentCount,
      absentCount,
      students
    } = req.body;

    // Check if a report already exists for this class and date
    const existingReport = await Report.findOne({
      classId,
      date: new Date(date)
    });

    if (existingReport) {
      // Update existing report
      existingReport.totalStudents = totalStudents;
      existingReport.presentCount = presentCount;
      existingReport.absentCount = absentCount;
      existingReport.students = students;
      await existingReport.save();

      return res.json({
        message: 'Report updated successfully',
        report: existingReport
      });
    }

    // Create new report
    const report = await Report.create({
      date: new Date(date),
      className,
      subjectCode,
      classId,
      totalStudents,
      presentCount,
      absentCount,
      students
    });

    res.status(201).json({
      message: 'Report saved successfully',
      report
    });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ message: 'Error saving report', error });
  }
};

// Get reports for a specific class
export const getReportsByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    let query: any = { classId: new mongoose.Types.ObjectId(classId) };

    // Add date range to query if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const reports = await Report.find(query).sort({ date: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports', error });
  }
};

// Get all reports
export const getAllReports = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let query: any = {};

    // Add date range to query if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const reports = await Report.find(query).sort({ date: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching all reports:', error);
    res.status(500).json({ message: 'Error fetching all reports', error });
  }
};

// Delete a report
export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const report = await Report.findByIdAndDelete(reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: 'Error deleting report', error });
  }
}; 