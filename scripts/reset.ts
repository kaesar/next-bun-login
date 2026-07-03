#!/usr/bin/env bun
/**
 * Database reset script.
 *
 * Usage:
 *   bun run db:reset
 *
 * This will:
 * 1. Delete the sqlite database file (and flight WAL/SHM sidecars)
 * 2. Re-run the migration + seed script to get a fresh database
 *
 * WARNING: This is destructive. All data in the local sqlite.db will be lost.
 */

import { unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DB_NAME = "sqlite.db";

// Resolve relative to project root (where the script is executed)
const dbPath = resolve(process.cwd(), DB_NAME);

console.log("🗑️  Resetting local SQLite database...");

// Remove main DB + WAL/SHM files that Bun/SQLite can create in WAL mode
const filesToRemove = [
  dbPath,
  `${dbPath}-wal`,
  `${dbPath}-shm`,
];

let removedSomething = false;

for (const file of filesToRemove) {
  if (existsSync(file)) {
    try {
      unlinkSync(file);
      console.log(`  ✓ Removed ${file.replace(process.cwd() + "/", "")}`);
      removedSomething = true;
    } catch (err) {
      console.error(`  ✗ Failed to remove ${file}:`, err);
      process.exit(1);
    }
  }
}

if (!removedSomething) {
  console.log("  (No existing database files found)");
}

console.log("\n🔄 Running migrations + seed...");

// Re-run the existing db:migrate logic.
const { spawnSync } = await import("node:child_process");

const result = spawnSync("bun", ["run", "scripts/migrate.ts"], {
  stdio: "inherit",
  cwd: process.cwd(),
});

if (result.status !== 0) {
  console.error("\n❌ Migration after reset failed.");
  process.exit(result.status ?? 1);
}

console.log("\n✅ Database reset complete. Fresh schema and seed data applied.");
console.log(`   Database file: ${DB_NAME}`);
console.log(`   Run \`bun run db:migrate\` again if you only want to re-apply schema+seed without dropping data.`);
