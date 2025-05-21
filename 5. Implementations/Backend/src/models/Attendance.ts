import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  classId: mongoose.Types.ObjectId;
  studentId: string;
  studentName?: string;
  timestamp: Date;
  date: Date; // Date-only value for the day of attendance
  status: 'present' | 'absent' | 'late';
  recordedVia: 'qr' | 'manual' | 'system';
  deviceInfo?: string;
  ipAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

const AttendanceSchema: Schema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  studentName: { type: String },
  timestamp: { type: Date, required: true },
  date: { type: Date, required: true }, // Store date only (without time component)
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
  recordedVia: { type: String, enum: ['qr', 'manual', 'system'], default: 'qr' },
  deviceInfo: { type: String },
  ipAddress: { type: String },
  location: {
    latitude: { type: Number },
    longitude: { type: Number }
  }
}, {
  timestamps: true // Add createdAt and updatedAt fields
});

// Create a compound index to optimize queries
AttendanceSchema.index({ classId: 1, timestamp: 1 });
AttendanceSchema.index({ studentId: 1, classId: 1 });

// Create a unique compound index to prevent duplicate attendance records per student per class per day
// This replaces the previous compound index that was causing issues
AttendanceSchema.index({ classId: 1, studentId: 1, date: 1 }, { unique: true });

// Pre-save middleware to ensure date field is set correctly
AttendanceSchema.pre('save', function(next) {
  if (this.isModified('timestamp') || !this.date) {
    // Create a new date object from timestamp and set to midnight
    const dateOnly = new Date(this.timestamp);
    dateOnly.setHours(0, 0, 0, 0);
    this.date = dateOnly;
  }
  next();
});

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema); 