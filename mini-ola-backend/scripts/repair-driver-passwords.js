#!/usr/bin/env node
// Repair driver documents that lack a password by assigning a temporary one.
// Usage (PowerShell): node .\scripts\repair-driver-passwords.js [--password Temp@12345]

require('dotenv').config();
const connectDB = require('../src/config/database');
const Driver = require('../src/models/Driver');

const args = process.argv.slice(2);
const pwdArgIndex = args.findIndex(a => a === '--password');
const TEMP_PASSWORD = pwdArgIndex !== -1 && args[pwdArgIndex + 1]
  ? String(args[pwdArgIndex + 1])
  : 'Temp@12345';

(async () => {
  try {
    await connectDB();

    // Find drivers with no usable password
    const filter = { $or: [
      { password: { $exists: false } },
      { password: null },
      { password: '' }
    ]};

    // Select +password so we can see if it's present
    const drivers = await Driver.find(filter).select('+password');

    if (!drivers.length) {
      console.log('✅ No driver documents with missing passwords were found.');
      process.exit(0);
    }

    console.log(`⚠️  Found ${drivers.length} driver(s) without a password. Assigning temporary password...`);

    const updated = [];
    for (const d of drivers) {
      d.password = TEMP_PASSWORD; // Will be hashed by pre-save hook
      // Skip validation in case legacy docs are missing some now-required fields
      await d.save({ validateBeforeSave: false });
      updated.push({ id: d._id.toString(), email: d.email, phone: d.phone });
    }

    console.log('✅ Updated drivers with a temporary password:');
    for (const u of updated) {
      console.log(` - ${u.id} | ${u.email || 'no-email'} | ${u.phone || 'no-phone'}`);
    }
    console.log('\nIMPORTANT: Ask these drivers to log in and change their password immediately.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error repairing driver passwords:', err.message);
    process.exit(1);
  }
})();
