require('dotenv').config();
const { MongoClient } = require('mongodb');

(async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('Missing MongoDB connection string in MONGODB_URI/MONGO_URI/DATABASE_URL');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    const ridersExists = (await db.listCollections({ name: 'riders' }).toArray()).length > 0;
    const usersExists = (await db.listCollections({ name: 'users' }).toArray()).length > 0;

    if (!usersExists) {
      console.log("'users' collection not found. Nothing to rename.");
      if (ridersExists) {
        console.log("Note: 'riders' collection already exists.");
      }
      return;
    }

    if (ridersExists) {
      console.log("Dropping existing 'riders' collection as requested...");
      await db.collection('riders').drop();
      console.log("Dropped 'riders'.");
    }

    console.log("Renaming 'users' -> 'riders'...");
    await db.collection('users').rename('riders', { dropTarget: true });
    console.log("Renamed successfully.");
  } catch (err) {
    console.error('Rename migration failed:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();