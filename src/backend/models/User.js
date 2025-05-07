import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  loginAttempts: [{
    success: Boolean,
    timestamp: { type: Date, default: Date.now },
    reason: String
  }]
});

export default mongoose.model('User', userSchema);
