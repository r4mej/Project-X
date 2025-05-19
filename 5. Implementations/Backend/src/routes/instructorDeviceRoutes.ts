import express from 'express';
import { 
  registerDevice,
  updateLocation,
  getInstructorDevices,
  removeDevice,
  getInstructorLocation
} from '../controllers/instructorDeviceController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Routes that require authentication
router.use(protect);

// Instructor device management routes (instructor only)
router.post('/register', registerDevice);
router.put('/location', updateLocation);
router.get('/devices', getInstructorDevices);
router.delete('/device/:deviceId', removeDevice);

// Student accessible route to get instructor location
router.get('/location/:instructorId', getInstructorLocation);

export default router; 