#!/usr/bin/env node
require('dotenv').config();
const connectDB = require('../src/config/database');
const Driver = require('../src/models/Driver');

(async () => {
  try {
    await connectDB();
    const recent = await Driver.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email phone vehicleNumber licenseNumber createdAt');
    console.log('Recent drivers:');
    for (const d of recent) {
      console.log({ id: d._id.toString(), name: d.name, email: d.email, phone: d.phone, vehicleNumber: d.vehicleNumber, licenseNumber: d.licenseNumber, createdAt: d.createdAt });
    }
    process.exit(0);
  } catch (e) {
    console.error('Error listing drivers:', e.message);
    process.exit(1);
  }
})();
