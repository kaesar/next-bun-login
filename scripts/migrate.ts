#!/usr/bin/env bun
/**
 * Database migration + seed script.
 * Usage: bun run db:migrate
 */

import db, { initSchema } from '../lib/db';

console.log('Running database migrations...');
initSchema();

// Seed demo user with hashed password (idempotent)
console.log('Seeding demo user...');

const name = "James Rodriguez";
const email = "james@example.com";
const password = "password123";

const hashedPassword = await Bun.password.hash(password);

const result = db
  .query(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET password = ? RETURNING *"
  )
  .get(name, email, hashedPassword, hashedPassword);

if (result) {
  console.log('User seeded:', result);
} else {
  console.log('Demo user already exists, skipping seed.');
}

console.log('\nMigration + seed complete.');
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
