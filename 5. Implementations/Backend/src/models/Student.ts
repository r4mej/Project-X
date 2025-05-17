import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  studentId: string;
  username: string;
  user: mongoose.Types.ObjectId;
  classes: mongoose.Types.ObjectId[];
}

const StudentSchema: Schema = new Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }]
}, {
  timestamps: true
});

export default mongoose.model<IStudent>('Student', StudentSchema); 