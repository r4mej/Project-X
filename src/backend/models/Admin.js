import mongoose from 'mongoose';
import User from './User.js';

const adminSchema = new mongoose.Schema({
  // If you have specific admin-only fields, add them here
});

export default User.discriminator('admin', adminSchema);
