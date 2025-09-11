import fs from 'fs';
import path from 'path';
import db from './database';

interface Migration {
  id: number;
  name: string;
  applied_at: string;
}

export class Migrator {
  private migrationsDir: string;
  
  constructor() {
    this.migrationsDir = path.join(__dirname, 'migrations');
  }
  
  async initialize(): Promise<void> {
    // Create migrations tracking table
    await db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  async migrate(): Promise<void> {
    await this.initialize();
    
    // Get all migration files
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    // Get applied migrations
    const applied = await db.all<Migration>('SELECT name FROM migrations');
    const appliedNames = new Set(applied.map(m => m.name));
    
    // Apply pending migrations
    for (const file of files) {
      if (!appliedNames.has(file)) {
        console.log(`Applying migration: ${file}`);
        
        const sql = fs.readFileSync(
          path.join(this.migrationsDir, file),
          'utf-8'
        );
        
        // Execute migration SQL (split by semicolons for multiple statements)
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const statement of statements) {
          await db.run(statement);
        }
        
        // Record migration
        await db.run('INSERT INTO migrations (name) VALUES (?)', [file]);
        console.log(`Migration ${file} applied successfully`);
      }
    }
    
    console.log('All migrations completed');
  }
  
  async reset(): Promise<void> {
    console.log('Resetting database...');
    
    // Drop all tables
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    for (const table of tables) {
      await db.run(`DROP TABLE IF EXISTS ${table.name}`);
    }
    
    console.log('Database reset complete');
    
    // Re-run migrations
    await this.migrate();
  }
}

export const migrator = new Migrator();
export default migrator;