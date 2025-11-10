#!/usr/bin/env node
/* Drops the 'riders' collection (rider accounts). */
const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI not found. Set it in mini-ola-backend/.env');
  process.exit(1);
}

async function dropRiders() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const exists = await db.listCollections({ name: 'riders' }).toArray();
  if (!exists.length) {
    console.log("ℹ️  Collection 'riders' does not exist. Nothing to drop.");
    await mongoose.disconnect();
    process.exit(0);
  }

  try {
    await db.dropCollection('riders');
    console.log("✅ Dropped collection 'riders'.");
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') {
      console.log("ℹ️  Collection 'riders' not found at drop time.");
    } else {
      console.error('❌ Failed to drop collection:', err.message);
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
}

function confirmAndRun() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("⚠️  This will permanently delete ALL riders. Type 'DROP RIDERS' to confirm: ", (answer) => {
    rl.close();
    if (answer.trim() === 'DROP RIDERS') {
      dropRiders();
    } else {
      console.log('Aborted.');
      process.exit(0);
    }
  });
}

confirmAndRun();
