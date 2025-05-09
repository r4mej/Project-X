import mongoose from 'mongoose';

const options = { discriminatorKey: 'role', collection: 'users' };

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  loginAttempts: [{
    success: Boolean,
    timestamp: { type: Date, default: Date.now },
    reason: String
  }]
}, options);

export default mongoose.model('User', userSchema);
