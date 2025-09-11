#!/usr/bin/env node

/**
 * Database reset script
 * Usage: npm run db:reset
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/niney.db');

// Delete existing database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Existing database deleted');
}

console.log('Database reset complete. Run the server to create a fresh database.');