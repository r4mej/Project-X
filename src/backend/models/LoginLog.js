import mongoose from 'mongoose';

const loginLogSchema = new mongoose.Schema({
  username: String,
  success: Boolean,
  reason: String,
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('LoginLog', loginLogSchema);
