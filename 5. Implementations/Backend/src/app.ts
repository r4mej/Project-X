import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import attendanceRoutes from './routes/attendanceRoutes';
import authRoutes from './routes/authRoutes';
import classRoutes from './routes/classRoutes';
import logRoutes from './routes/logRoutes';
import reportRoutes from './routes/reportRoutes';
import studentRoutes from './routes/studentRoutes';
import userRoutes from './routes/userRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple test endpoint at the root
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint for the API
app.get('/api/test', (req, res) => {
  res.status(200).json({
    message: 'API is accessible',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

export default app; 