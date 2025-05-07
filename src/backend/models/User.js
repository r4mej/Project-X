import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'student', 'instructor'],
    required: true
  },
  loginAttempts: [{
    success: Boolean,
    timestamp: { type: Date, default: Date.now },
    reason: String
  }],
  studentInfo: {
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
  },
  instructorInfo: {
    IfirstName: String,
    ImiddleName: String,
    IlastName: String,
    courses: [String],
    registeredDeviceId: String
  }
});

export default mongoose.model('User', userSchema);
