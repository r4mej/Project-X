import mongoose from 'mongoose';

const dropIndex = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/test');
    
    console.log('Getting collection...');
    const db = mongoose.connection.db;
    const collection = db.collection('logs');

    console.log('Listing current indexes...');
    const indexes = await collection.listIndexes().toArray();
    console.log('Current indexes:', indexes);

    console.log('Attempting to drop sessionId index...');
    try {
      await collection.dropIndex('sessionId_1');
      console.log('Index dropped successfully');
    } catch (dropError: any) {
      if (dropError.code === 27) {
        console.log('Index does not exist, proceeding...');
      } else {
        throw dropError;
      }
    }

    // Create new non-unique index
    console.log('Creating new non-unique index...');
    await collection.createIndex(
      { sessionId: 1, action: 1, timestamp: 1 },
      { unique: false }
    );
    console.log('New index created successfully');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

dropIndex(); 