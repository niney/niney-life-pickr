import bcrypt from 'bcrypt';
import db from '../db/database';

export interface User {
  id?: number;
  email: string;
  username: string;
  password_hash?: string;
  provider?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  is_active?: boolean;
}

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  provider?: string;
}

export class UserService {
  private readonly SALT_ROUNDS = 10;
  
  /**
   * Create a new user
   */
  async createUser(userData: CreateUserDto): Promise<User> {
    const { email, username, password, provider = 'local' } = userData;
    
    // Check if user already exists
    const existingUser = await db.get<User>(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    
    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('Email already exists');
      }
      if (existingUser.username === username) {
        throw new Error('Username already exists');
      }
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, this.SALT_ROUNDS);
    
    // Insert user
    await db.run(
      `INSERT INTO users (email, username, password_hash, provider) 
       VALUES (?, ?, ?, ?)`,
      [email, username, password_hash, provider]
    );
    
    // Get created user
    const user = await db.get<User>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (!user) {
      throw new Error('Failed to create user');
    }
    
    // Remove password_hash from response
    delete user.password_hash;
    
    return user;
  }
  
  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<User | undefined> {
    return db.get<User>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
      [email]
    );
  }
  
  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | undefined> {
    return db.get<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
  }
  
  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | undefined> {
    const user = await db.get<User>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (user) {
      delete user.password_hash;
    }
    
    return user;
  }
  
  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    
    if (!user || !user.password_hash) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }
    
    // Update last login
    await db.run(
      "UPDATE users SET last_login = datetime('now', 'localtime') WHERE id = ?",
      [user.id]
    );
    
    // Get updated user with last_login
    const updatedUser = await db.get<User>(
      'SELECT id, email, username, provider, created_at, last_login, is_active FROM users WHERE id = ?',
      [user.id]
    );
    
    return updatedUser || user;
  }
  
  /**
   * Get all users (for testing)
   */
  async getAllUsers(): Promise<User[]> {
    const users = await db.all<User>(
      'SELECT id, email, username, provider, created_at, last_login, is_active FROM users'
    );
    return users;
  }
}

export const userService = new UserService();
export default userService;