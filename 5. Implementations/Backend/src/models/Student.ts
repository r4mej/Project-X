import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  studentId: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  email: string;
  classId: mongoose.Types.ObjectId;
  yearLevel: string;
  course: string;
  attendanceStats: {
    present: number;
    absent: number;
    late: number;
  };
}

const StudentSchema: Schema = new Schema({
  studentId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  middleInitial: { type: String },
  email: { type: String, required: true, unique: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  yearLevel: { type: String, required: true },
  course: { type: String, required: true },
  attendanceStats: {
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    late: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Create compound indexes
StudentSchema.index({ studentId: 1, classId: 1 });
StudentSchema.index({ email: 1 });

export default mongoose.model<IStudent>('Student', StudentSchema); 