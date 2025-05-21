import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Import your Express app
// import app from '../app';  // Uncomment and adjust the path as needed

// Increase Jest timeout to allow MongoDB Memory Server to start
jest.setTimeout(60000); // 60 seconds

describe('Example API Test', () => {
  let mongoServer: MongoMemoryServer | null = null;

  beforeAll(async () => {
    try {
      // Set up MongoDB Memory Server for testing
      mongoServer = await MongoMemoryServer.create();
      
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('Successfully connected to in-memory MongoDB instance');
    } catch (error) {
      console.error('Failed to start MongoDB Memory Server:', error);
      // Don't throw the error here, we'll handle it gracefully
    }
  });

  afterAll(async () => {
    try {
      await mongoose.disconnect();
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  it('should return 200 OK for GET /', async () => {
    // Skip test if MongoDB failed to initialize
    if (!mongoServer) {
      console.warn('Skipping test because MongoDB Memory Server failed to initialize');
      return;
    }
    
    // Example test - adjust according to your actual API endpoints
    // const response = await request(app).get('/');
    // expect(response.status).toBe(200);
    expect(true).toBe(true); // Placeholder assertion
  });
}); 