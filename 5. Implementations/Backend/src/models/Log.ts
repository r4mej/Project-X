import mongoose, { Document, Schema } from 'mongoose';

// First, try to drop the existing model if it exists
if (mongoose.models.Log) {
  delete mongoose.models.Log;
}

export interface ILog extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  role: string;
  sessionId: string;
  action: 'LOGIN' | 'LOGOUT';
  timestamp: Date;
  ipAddress?: string;
  deviceInfo?: string;
  sessionData: {
    loginTime?: Date;
    logoutTime?: Date;
    duration?: number; // Duration in milliseconds
    status: 'active' | 'completed' | 'terminated';
  };
}

const LogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  role: { type: String, required: true },
  sessionId: { 
    type: String, 
    required: true
  },
  action: { type: String, required: true, enum: ['LOGIN', 'LOGOUT'] },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  deviceInfo: { type: String },
  sessionData: {
    loginTime: { type: Date },
    logoutTime: { type: Date },
    duration: { type: Number },
    status: { 
      type: String, 
      enum: ['active', 'completed', 'terminated'],
      default: 'active'
    }
  }
}, {
  timestamps: true
});

// Remove all existing indexes
LogSchema.indexes().forEach(index => {
  LogSchema.index(index[0], { ...index[1], unique: false });
});

// Add our new non-unique indexes
LogSchema.index({ userId: 1, timestamp: -1 }, { unique: false });
LogSchema.index({ sessionId: 1, action: 1, timestamp: 1 }, { unique: false });

// Create the model
const Log = mongoose.model<ILog>('Log', LogSchema);

// Force index rebuild on next application start
Log.collection.dropIndexes().catch(err => {
  console.warn('Warning: Could not drop indexes, they may not exist yet:', err.message);
});

export default Log; 