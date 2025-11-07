#!/usr/bin/env node
// Seed a test driver account for local development
// Credentials: driver@test.com / test123

require('dotenv').config();
const connectDB = require('../src/config/database');
const Driver = require('../src/models/Driver');

(async () => {
  try {
    await connectDB();

    const email = 'driver@test.com';
    const phone = '9999999999';

    let existing = await Driver.findOne({ $or: [{ email }, { phone }] }).select('+password');
    if (existing) {
      console.log('ℹ️  Test driver already exists:', existing._id.toString());
      // Ensure it has a password
      if (!existing.password) {
        existing.password = 'test123';
        await existing.save({ validateBeforeSave: false });
        console.log('✅ Set password for existing test driver.');
      }
      process.exit(0);
    }

    // Generate unique-ish identifiers to avoid unique index conflicts
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const driver = await Driver.create({
      name: 'Test Driver',
      email,
      phone,
      password: 'test123',
      role: 'driver',
      vehicleType: 'sedan',
      vehicleNumber: `KA01AB${suffix}`,
      vehicleModel: 'Dzire',
      vehicleColor: 'White',
      licenseNumber: `KA01${suffix}5678`,
      licenseExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 3) // +3 years
    });

    console.log('✅ Seeded test driver:', driver._id.toString());
    console.log('   Email: driver@test.com');
    console.log('   Password: test123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding test driver:', err.message);
    process.exit(1);
  }
})();
