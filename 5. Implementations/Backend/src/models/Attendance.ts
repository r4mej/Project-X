import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  classId: mongoose.Types.ObjectId;
  studentId: string;
  studentName?: string;
  timestamp: Date;
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

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema); 