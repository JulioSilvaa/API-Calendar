
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import bcrypt from 'bcrypt';

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

async function verifyUserCreation() {
  const client = await pool.connect();
  const email = `test_verify_${Date.now()}@example.com`;
  const password = 'password123';
  
  try {
    console.log(`Attempting to insert user: ${email}`);
    
    const hash = await bcrypt.hash(password, 10);
    
    const res = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hash]
    );

    if (res.rows.length === 1 && res.rows[0].email === email) {
      console.log('✓ User inserted successfully!');
      console.log('User details:', res.rows[0]);
    } else {
      console.error('❌ Insertion failed or returned unexpected result.');
    }

  } catch (err) {
    console.error('❌ Error confirming user creation:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyUserCreation();
