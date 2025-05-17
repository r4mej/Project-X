import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeSlot {
  days: string[];
  startTime: string;
  startPeriod: string;
  endTime: string;
  endPeriod: string;
}

export interface IClass extends Document {
  className: string;
  subjectCode: string;
  schedules: ITimeSlot[];
  course: string;
  room: string;
  yearSection: string;
  instructor: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema({
  days: [{
    type: String,
    enum: ['SU', 'M', 'T', 'W', 'TH', 'F', 'S'],
    required: true
  }],
  startTime: {
    type: String,
    required: true,
    trim: true
  },
  startPeriod: {
    type: String,
    enum: ['AM', 'PM'],
    required: true
  },
  endTime: {
    type: String,
    required: true,
    trim: true
  },
  endPeriod: {
    type: String,
    enum: ['AM', 'PM'],
    required: true
  }
});

const ClassSchema: Schema = new Schema({
  className: {
    type: String,
    required: true,
    trim: true,
  },
  subjectCode: {
    type: String,
    required: true,
    trim: true,
  },
  schedules: [TimeSlotSchema],
  course: {
    type: String,
    required: true,
    trim: true,
  },
  room: {
    type: String,
    required: true,
    trim: true,
  },
  yearSection: {
    type: String,
    required: true,
    trim: true,
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IClass>('Class', ClassSchema); 