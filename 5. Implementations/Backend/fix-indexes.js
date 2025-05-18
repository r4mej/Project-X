// Simple script to fix MongoDB indexes
const { MongoClient } = require('mongodb');

// Connection URI
const uri = "mongodb://localhost:27017/";

// Create a new MongoClient
const client = new MongoClient(uri);

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Connected successfully to MongoDB server");
    
    // Get database and collection
    const database = client.db("attendance");
    const students = database.collection("students");
    
    // Print current indexes
    console.log("Current indexes:");
    const currentIndexes = await students.indexes();
    console.log(currentIndexes);
    
    // Drop all indexes (except _id which cannot be dropped)
    console.log("\nDropping indexes...");
    await students.dropIndexes();
    console.log("All indexes dropped");
    
    // Create only the compound index
    console.log("\nCreating new compound index...");
    await students.createIndex({ studentId: 1, classId: 1 }, { unique: true });
    console.log("Compound index created");
    
    // Print new indexes
    console.log("\nNew indexes:");
    const newIndexes = await students.indexes();
    console.log(newIndexes);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
    console.log("MongoDB connection closed");
  }
}

run().catch(console.dir); 