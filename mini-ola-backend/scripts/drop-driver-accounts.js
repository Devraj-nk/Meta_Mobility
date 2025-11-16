#!/usr/bin/env node
/*
  Safe drop script for 'driver_accounts' collection in MongoDB Atlas.
  Features:
  - Optional backup to JSON before drop
  - Double confirmation flags
  - Uses MONGODB_URI from environment

  Usage (PowerShell):
    $env:MONGODB_URI = "<your mongodb uri>"
    node ./scripts/drop-driver-accounts.js --yes --backup ./backups

  Flags:
    --yes                 Proceed without interactive prompt
    --backup <dir>        Save JSON backup to the given directory before drop
    --dry-run             Only print counts; do not drop
    --rename <newName>    Rename collection instead of drop (implies --yes)
*/

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const argv = process.argv.slice(2);
const wantsYes = argv.includes('--yes');
const dryRun = argv.includes('--dry-run');
const backupDirArgIndex = argv.findIndex((a) => a === '--backup');
const backupDir = backupDirArgIndex !== -1 ? argv[backupDirArgIndex + 1] : null;
const renameArgIndex = argv.findIndex((a) => a === '--rename');
const renameTo = renameArgIndex !== -1 ? argv[renameArgIndex + 1] : null;

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Error: MONGODB_URI environment variable is not set.');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const collectionName = 'driver_accounts';

    // Check collection exists
    const collections = await db.listCollections().toArray();
    const exists = collections.some((c) => c.name === collectionName);

    if (!exists) {
      console.log(`Collection '${collectionName}' does not exist. Nothing to drop.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const count = await db.collection(collectionName).countDocuments();
    console.log(`Collection: ${collectionName}`);
    console.log(`Document count: ${count}`);

    if (dryRun) {
      console.log('Dry run: no changes made.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Optional backup
    if (backupDir) {
      const outDir = path.resolve(process.cwd(), backupDir);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outFile = path.join(outDir, `driver_accounts-backup-${timestamp}.json`);

      console.log(`Backing up '${collectionName}' to: ${outFile}`);
      const cursor = db.collection(collectionName).find({});
      const all = [];
      for await (const doc of cursor) {
        all.push(doc);
      }
      fs.writeFileSync(outFile, JSON.stringify(all, null, 2), 'utf8');
      console.log(`Backup complete: ${all.length} documents saved.`);
    }

    if (renameTo) {
      const newName = String(renameTo);
      console.log(`Renaming collection '${collectionName}' to '${newName}'...`);
      await db.collection(collectionName).rename(newName, { dropTarget: false });
      console.log('Rename complete.');
      await mongoose.disconnect();
      process.exit(0);
    }

    if (!wantsYes) {
      console.error('Refusing to drop without --yes flag. Re-run with --yes to confirm.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`Dropping collection '${collectionName}'...`);
    await db.dropCollection(collectionName);
    console.log('Drop complete.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Operation failed:', err.message);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
})();
