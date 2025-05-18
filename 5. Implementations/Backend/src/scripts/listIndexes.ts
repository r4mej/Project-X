import mongoose from 'mongoose';
import Log from '../models/Log';

const listIndexes = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    
    console.log('Listing indexes...');
    const indexes = await Log.collection.listIndexes().toArray();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
  } catch (error) {
    console.error('Error listing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

listIndexes(); 