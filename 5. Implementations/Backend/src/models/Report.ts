import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  date: Date;
  className: string;
  subjectCode: string;
  classId: mongoose.Types.ObjectId;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  students: Array<{
    studentId: string;
    studentName: string;
    status: 'present' | 'absent' | 'late';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema({
  date: { type: Date, required: true },
  className: { type: String, required: true },
  subjectCode: { type: String, required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  totalStudents: { type: Number, required: true },
  presentCount: { type: Number, required: true },
  absentCount: { type: Number, required: true },
  students: [{
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], required: true }
  }]
}, {
  timestamps: true
});

// Create compound indexes for efficient querying
ReportSchema.index({ classId: 1, date: 1 });
ReportSchema.index({ date: 1 });

export default mongoose.model<IReport>('Report', ReportSchema); 