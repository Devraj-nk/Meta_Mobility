const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

let useRealMongo = true;

async function startMemoryMongo() {
  // Use real MongoDB (Atlas or local) for tests instead of MongoDB Memory Server
  // This avoids issues with MongoDB Memory Server on Windows
  // The MONGODB_URI should come from .env file (loaded above)
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mini-ola-test';
  
  // For tests, append a test database name to avoid affecting production data
  if (uri.includes('mongodb+srv://') || uri.includes('mongodb://')) {
    // For Atlas or connection strings, ensure we use a test database
    const dbName = 'mini-ola-test';
    process.env.MONGODB_URI = uri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
  } else {
    process.env.MONGODB_URI = uri;
  }
  
  return process.env.MONGODB_URI;
}

async function close() {
  if (mongoose.connection.readyState) {
    // Drop the test database to clean up
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
}

async function clear() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
}

module.exports = { startMemoryMongo, close, clear };