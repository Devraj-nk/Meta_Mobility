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

    const usersCol = db.collection('users');
    const ridersCol = db.collection('riders');
    const driversCol = db.collection('drivers');

    const usersExists = (await db.listCollections({ name: 'users' }).toArray()).length > 0;
    if (!usersExists) {
      console.log('No users collection found. Nothing to migrate.');
      return;
    }

    console.log('Starting migration: split users -> riders/drivers');

    // Create indexes for target collections if missing
    await ridersCol.createIndex({ email: 1 }, { unique: true }).catch(()=>{});
    await ridersCol.createIndex({ phone: 1 }, { unique: true }).catch(()=>{});
    await driversCol.createIndex({ email: 1 }, { unique: true }).catch(()=>{});
    await driversCol.createIndex({ phone: 1 }, { unique: true }).catch(()=>{});

    const cursor = usersCol.find({});
    let movedRiders = 0, movedDrivers = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const {_id, role} = doc;
      const target = role === 'driver' ? driversCol : ridersCol;

      // Upsert into target preserving _id
      const { matchedCount, upsertedCount } = await target.updateOne(
        { _id },
        { $set: doc },
        { upsert: true }
      );

      if (role === 'driver') movedDrivers += (upsertedCount || !matchedCount ? 1 : 0);
      else movedRiders += (upsertedCount || !matchedCount ? 1 : 0);
    }

    // Drop users collection
    await usersCol.drop();

    console.log(`Migration complete. Riders upserted: ${movedRiders}, Drivers upserted: ${movedDrivers}. Dropped 'users' collection.`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
