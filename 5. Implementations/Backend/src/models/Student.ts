import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  classId: mongoose.Types.ObjectId;
  studentId: string;
  surname: string;
  firstName: string;
  middleInitial?: string;
}

const StudentSchema: Schema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  studentId: { type: String, required: true },
  surname: { type: String, required: true },
  firstName: { type: String, required: true },
  middleInitial: { type: String },
});

export default mongoose.model<IStudent>('Student', StudentSchema); 