import mongoose from 'mongoose';
import User from './User.js';

const instructorSchema = new mongoose.Schema({
  firstName: String,
  middleName: String,
  lastName: String,
  courses: [String],
  registeredDeviceId: String
});

export default User.discriminator('instructor', instructorSchema);
