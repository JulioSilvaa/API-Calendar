
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

// Setup environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'api_calendar',
  user: process.env.DB_USER || 'api_calendar_user',
  password: process.env.DB_PASSWORD,
});

async function createUsersTable() {
  const client = await pool.connect();
  try {
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create index on email
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Create update trigger
    await client.query(`
      CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('Users table created successfully!');
  } catch (err) {
    if (err.message.includes('already exists')) {
        console.log('Trigger already exists, ignoring.');
    } else {
        console.error('Error creating users table:', err);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

createUsersTable();
