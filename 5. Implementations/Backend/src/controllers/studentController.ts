import { Request, Response } from 'express';
import Student from '../models/Student';

export const getStudentsByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const students = await Student.find({ classId });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const addStudent = async (req: Request, res: Response) => {
  try {
    const { 
      classId, 
      studentId, 
      firstName, 
      lastName, 
      middleInitial, 
      email,
      yearLevel,
      course 
    } = req.body;

    // Validate required fields
    if (!classId || !studentId || !firstName || !lastName || !email || !yearLevel || !course) {
      return res.status(400).json({ 
        error: 'Missing required fields. Required: classId, studentId, firstName, lastName, email, yearLevel, course' 
      });
    }

    const student = new Student({ 
      classId, 
      studentId, 
      firstName, 
      lastName, 
      middleInitial,
      email,
      yearLevel,
      course
    });
    
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { studentId, surname, firstName, middleInitial } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { studentId, surname, firstName, middleInitial },
      { new: true }
    );
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}; 