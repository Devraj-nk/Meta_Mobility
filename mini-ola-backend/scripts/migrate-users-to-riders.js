// This migration script is no longer needed. The 'users' collection has been migrated
// to 'riders' and the codebase now targets the 'riders' collection directly.
// Intentionally left as a no-op to prevent accidental destructive runs in other environments.
console.log('[noop] migrate-users-to-riders.js: migration not required.');
process.exit(0);
