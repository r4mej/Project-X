import { Request, Response } from 'express';
import InstructorDevice, { IInstructorDevice } from '../models/InstructorDevice';
import User from '../models/User';

// Register a new device for an instructor
export const registerDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceName } = req.body;
    const instructorId = req.user?.userId;

    if (!instructorId) {
      return res.status(401).json({ message: 'Unauthorized. User ID not found.' });
    }

    // Verify the user is an instructor
    const user = await User.findOne({ userId: instructorId });
    if (!user || user.role !== 'instructor') {
      return res.status(403).json({ message: 'Forbidden. Only instructors can register devices.' });
    }

    // Check if device is already registered
    const existingDevice = await InstructorDevice.findOne({ deviceId });
    if (existingDevice) {
      return res.status(409).json({ message: 'Device is already registered.' });
    }

    // Create new device
    const newDevice = new InstructorDevice({
      instructorId,
      deviceId,
      deviceName,
    });

    const savedDevice = await newDevice.save();
    res.status(201).json(savedDevice);
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ message: 'Failed to register device.', error });
  }
};

// Update device location
export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { deviceId, latitude, longitude, accuracy } = req.body;
    const instructorId = req.user?.userId;

    if (!instructorId) {
      return res.status(401).json({ message: 'Unauthorized. User ID not found.' });
    }

    // Find the device
    const device = await InstructorDevice.findOne({ 
      deviceId,
      instructorId 
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found or not owned by this instructor.' });
    }

    // Update the location
    device.lastLocation = {
      latitude,
      longitude,
      accuracy,
      timestamp: new Date()
    };

    await device.save();
    res.status(200).json({ message: 'Location updated successfully', device });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Failed to update location.', error });
  }
};

// Get all devices for an instructor
export const getInstructorDevices = async (req: Request, res: Response) => {
  try {
    const instructorId = req.user?.userId;

    if (!instructorId) {
      return res.status(401).json({ message: 'Unauthorized. User ID not found.' });
    }

    const devices = await InstructorDevice.find({ instructorId });
    res.status(200).json(devices);
  } catch (error) {
    console.error('Error getting instructor devices:', error);
    res.status(500).json({ message: 'Failed to get devices.', error });
  }
};

// Remove a device
export const removeDevice = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const instructorId = req.user?.userId;

    if (!instructorId) {
      return res.status(401).json({ message: 'Unauthorized. User ID not found.' });
    }

    const device = await InstructorDevice.findOneAndDelete({ 
      deviceId,
      instructorId 
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found or not owned by this instructor.' });
    }

    res.status(200).json({ message: 'Device removed successfully' });
  } catch (error) {
    console.error('Error removing device:', error);
    res.status(500).json({ message: 'Failed to remove device.', error });
  }
};

// Get instructor's last location (for students)
export const getInstructorLocation = async (req: Request, res: Response) => {
  try {
    const { instructorId } = req.params;

    // Verify the instructor exists
    const instructor = await User.findOne({ userId: instructorId, role: 'instructor' });
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found.' });
    }

    // Find the instructor's active device with the most recent location
    const devices = await InstructorDevice.find({ 
      instructorId, 
      active: true,
      'lastLocation.latitude': { $ne: null },
      'lastLocation.longitude': { $ne: null }
    }).sort({ 'lastLocation.timestamp': -1 });

    if (devices.length === 0 || !devices[0].lastLocation?.timestamp) {
      return res.status(404).json({ message: 'No location data available for this instructor.' });
    }

    // Only return the location data, not the full device details
    const location = {
      latitude: devices[0].lastLocation.latitude,
      longitude: devices[0].lastLocation.longitude,
      accuracy: devices[0].lastLocation.accuracy,
      timestamp: devices[0].lastLocation.timestamp
    };

    res.status(200).json(location);
  } catch (error) {
    console.error('Error getting instructor location:', error);
    res.status(500).json({ message: 'Failed to retrieve instructor location.', error });
  }
}; 