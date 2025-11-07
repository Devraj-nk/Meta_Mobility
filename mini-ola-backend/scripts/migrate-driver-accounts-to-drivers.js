6#!/usr/bin/env node
/*
  Migration: Merge DriverAccount into Driver
  - Copies auth fields from driver_accounts into drivers
  - Removes 'user' field from drivers
  - Repoints rides.driver and payments.driver from DriverAccount _id to Driver _id

  Usage (PowerShell):
    Set-Location -Path "mini-ola-backend"
    $env:MONGODB_URI = "<your MongoDB URI>"
    node .\scripts\migrate-driver-accounts-to-drivers.js --dry-run
    node .\scripts\migrate-driver-accounts-to-drivers.js --yes

  Flags:
    --dry-run  Preview changes only
    --yes      Execute writes
*/

const mongoose = require('mongoose');

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run') && !argv.includes('--yes');
const EXECUTE = argv.includes('--yes');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Error: MONGODB_URI not set');
  process.exit(1);
}

(async () => {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const driversColl = db.collection('drivers');
  const driverAccountsColl = db.collection('driver_accounts');
  const ridesColl = db.collection('rides');
  const paymentsColl = db.collection('payments');

  try {
    const driversWithUser = await driversColl.find({ user: { $exists: true } }).toArray();
    console.log(`Found ${driversWithUser.length} driver profiles with 'user' ref`);

    // Build mapping DriverAccount _id -> Driver _id
    const map = {};
    for (const d of driversWithUser) {
      if (d.user) {
        map[d.user.toString()] = d._id;
      }
    }

    // Fetch DriverAccount docs
    const accountIds = Object.keys(map).map(id => new mongoose.Types.ObjectId(id));
    const accounts = await driverAccountsColl.find({ _id: { $in: accountIds } }).toArray();

    // Merge fields into Driver
    let updatedDrivers = 0;
    for (const acc of accounts) {
      const driverId = map[acc._id.toString()];
      const update = {
        $set: {
          name: acc.name,
          email: acc.email,
          phone: acc.phone,
          password: acc.password, // already hashed in DriverAccount
          role: 'driver',
          isActive: acc.isActive ?? true,
          isVerified: acc.isVerified ?? false,
          profilePicture: acc.profilePicture || '',
          rating: acc.rating ?? 5.0,
          totalRatings: acc.totalRatings ?? 0,
          ridesCompleted: acc.ridesCompleted ?? 0
        },
        $unset: { user: '' }
      };
      console.log(`Would update driver ${driverId} with auth fields from account ${acc._id}`);
      if (EXECUTE) {
        await driversColl.updateOne({ _id: driverId }, update);
      }
      updatedDrivers++;
    }

    console.log(`Drivers to update: ${updatedDrivers}`);

    // Repoint rides.driver
    const rideFilter = { driver: { $in: accountIds } };
    const rideCount = await ridesColl.countDocuments(rideFilter);
    console.log(`Rides to repoint: ${rideCount}`);
    if (rideCount > 0) {
      // Process in batches
      const cursor = ridesColl.find(rideFilter);
      let changed = 0;
      while (await cursor.hasNext()) {
        const r = await cursor.next();
        const newDriverId = map[r.driver.toString()];
        if (newDriverId) {
          console.log(`Would set ride ${r._id} driver -> ${newDriverId}`);
          if (EXECUTE) {
            await ridesColl.updateOne({ _id: r._id }, { $set: { driver: newDriverId } });
          }
          changed++;
        }
      }
      console.log(`Rides updated: ${changed}`);
    }

    // Repoint payments.driver
    const payFilter = { driver: { $in: accountIds } };
    const payCount = await paymentsColl.countDocuments(payFilter);
    console.log(`Payments to repoint: ${payCount}`);
    if (payCount > 0) {
      const cursor = paymentsColl.find(payFilter);
      let changed = 0;
      while (await cursor.hasNext()) {
        const p = await cursor.next();
        const newDriverId = map[p.driver.toString()];
        if (newDriverId) {
          console.log(`Would set payment ${p._id} driver -> ${newDriverId}`);
          if (EXECUTE) {
            await paymentsColl.updateOne({ _id: p._id }, { $set: { driver: newDriverId } });
          }
          changed++;
        }
      }
      console.log(`Payments updated: ${changed}`);
    }

    console.log('Migration complete.', DRY_RUN ? '(dry-run)' : '(executed)');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
