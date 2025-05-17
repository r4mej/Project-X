import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/database';
import attendanceRoutes from './routes/attendanceRoutes';
import authRoutes from './routes/authRoutes';
import classRoutes from './routes/classRoutes';
import logRoutes from './routes/logRoutes';
import reportRoutes from './routes/reportRoutes';
import studentRoutes from './routes/studentRoutes';
import userRoutes from './routes/userRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/reports', reportRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Enhanced test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is accessible',
    timestamp: new Date().toISOString(),
    routes: [
      '/api/auth',
      '/api/users',
      '/api/logs',
      '/api/classes',
      '/api/students',
      '/api/attendance',
      '/api/reports'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test the API at http://localhost:${PORT}/api/test`);
}); 