import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  date: Date;
  status: 'present' | 'absent' | 'late';
  method: 'qr' | 'manual' | 'gps';
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
}

const AttendanceSchema: Schema = new Schema({
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'present'
  },
  method: {
    type: String,
    enum: ['qr', 'manual', 'gps'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    latitude: Number,
    longitude: Number
  }
}, {
  timestamps: true
});

// Create compound index for unique attendance per student per class per day
AttendanceSchema.index({ classId: 1, studentId: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema); 