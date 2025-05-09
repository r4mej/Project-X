import mongoose from 'mongoose';
import User from './User.js';

const studentSchema = new mongoose.Schema({
  firstName: String,
  middleName: String,
  lastName: String,
  studentId: String,
  yearLevel: String,
  program: String,
  faculty: String,
  attendance: [{
    date: Date,
    status: String // Present, Absent, Late
  }]
});

export default User.discriminator('student', studentSchema);
