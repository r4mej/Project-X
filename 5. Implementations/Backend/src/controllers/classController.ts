import { Request, Response } from 'express';
import Class from '../models/Class';

// Get all classes
export const getAllClasses = async (req: Request, res: Response) => {
  try {
    const classes = await Class.find().sort({ createdAt: -1 });
    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching classes', error });
  }
};

// Get a single class by ID
export const getClassById = async (req: Request, res: Response) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.status(200).json(classItem);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching class', error });
  }
};

// Create a new class
export const createClass = async (req: Request, res: Response) => {
  try {
    const newClass = new Class(req.body);
    const savedClass = await newClass.save();
    res.status(201).json(savedClass);
  } catch (error) {
    res.status(400).json({ message: 'Error creating class', error });
  }
};

// Update a class
export const updateClass = async (req: Request, res: Response) => {
  try {
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.status(200).json(updatedClass);
  } catch (error) {
    res.status(400).json({ message: 'Error updating class', error });
  }
};

// Delete a class
export const deleteClass = async (req: Request, res: Response) => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);
    if (!deletedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.status(200).json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting class', error });
  }
}; 