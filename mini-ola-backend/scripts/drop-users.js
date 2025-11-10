#!/usr/bin/env node
/*
 * Danger: Drops the 'users' collection from the connected MongoDB database.
 * Usage:
 *   npm run db:drop-users            # will prompt for confirmation
 *   FORCE=1 npm run db:drop-users    # skip prompt
 *
 * Requires MONGODB_URI in environment (.env at mini-ola-backend root).
 */

const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI not found. Set it in mini-ola-backend/.env');
  process.exit(1);
}

async function dropUsers() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const exists = await db.listCollections({ name: 'users' }).toArray();
  if (!exists.length) {
    console.log("ℹ️  Collection 'users' does not exist. Nothing to drop.");
    await mongoose.disconnect();
    process.exit(0);
  }

  try {
    await db.dropCollection('users');
    console.log("✅ Dropped collection 'users'.");
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') {
      console.log("ℹ️  Collection 'users' not found at drop time.");
    } else {
      console.error('❌ Failed to drop collection:', err.message);
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
}

function confirmAndRun() {
  if (process.env.FORCE === '1' || process.env.FORCE === 'true') {
    return dropUsers();
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("⚠️  This will permanently delete ALL users. Type 'DROP USERS' to confirm: ", (answer) => {
    rl.close();
    if (answer.trim() === 'DROP USERS') {
      dropUsers();
    } else {
      console.log('Aborted.');
      process.exit(0);
    }
  });
}

confirmAndRun();
