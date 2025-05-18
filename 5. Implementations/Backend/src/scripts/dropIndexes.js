// Script to manually drop all indexes on the students collection
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance';

async function dropIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the students collection
    const studentCollection = mongoose.connection.collection('students');
    
    // Get current indexes
    const indexes = await studentCollection.indexes();
    console.log('Current indexes:', indexes);

    // Drop all indexes except _id
    console.log('Dropping all non-_id indexes...');
    await studentCollection.dropIndexes();
    
    // Create only the compound index
    console.log('Creating compound index on studentId and classId...');
    await studentCollection.createIndex({ studentId: 1, classId: 1 }, { unique: true });

    console.log('Indexes after changes:');
    const newIndexes = await studentCollection.indexes();
    console.log(newIndexes);

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
    process.exit(0);
  }
}

dropIndexes(); 