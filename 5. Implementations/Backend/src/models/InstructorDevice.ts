import mongoose, { Document, Schema } from 'mongoose';

export interface IInstructorDevice extends Document {
  instructorId: string;
  deviceId: string;
  deviceName: string;
  lastLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InstructorDeviceSchema: Schema = new Schema({
  instructorId: {
    type: String,
    required: true,
    index: true,
  },
  deviceId: {
    type: String,
    required: true,
    unique: true,
  },
  deviceName: {
    type: String,
    required: true,
  },
  lastLocation: {
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: null,
    }
  },
  active: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

export default mongoose.model<IInstructorDevice>('InstructorDevice', InstructorDeviceSchema); 