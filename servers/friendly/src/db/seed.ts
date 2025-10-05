import bcrypt from 'bcrypt';
import db from './database';

export class Seeder {
  /**
   * Seed default test user (niney@ks.com / tester)
   */
  async seedDefaultUser(): Promise<void> {
    // Check if user already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ?',
      ['niney@ks.com']
    );

    if (existingUser) {
      console.log('Default user already exists, skipping seed');
      return;
    }

    console.log('Creating default user: niney@ks.com');

    // Hash password
    const passwordHash = await bcrypt.hash('tester', 10);

    // Insert default user
    await db.run(
      `INSERT INTO users (email, username, password_hash, provider, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      ['niney@ks.com', 'niney', passwordHash, 'local', 1]
    );

    console.log('Default user created successfully');
  }

  /**
   * Run all seeders
   */
  async seed(): Promise<void> {
    console.log('Running seeders...');
    await this.seedDefaultUser();
    console.log('All seeders completed');
  }
}

export const seeder = new Seeder();
export default seeder;
