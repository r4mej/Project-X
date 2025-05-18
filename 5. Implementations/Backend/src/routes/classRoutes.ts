import express from 'express';
import {
    createClass,
    deleteClass,
    getAllClasses,
    getClassById,
    updateClass,
} from '../controllers/classController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET all classes
router.get('/', getAllClasses);

// GET a single class by ID
router.get('/:id', getClassById);

// POST create a new class
router.post('/', createClass);

// PUT update a class
router.put('/:id', updateClass);

// DELETE a class
router.delete('/:id', deleteClass);

export default router; 