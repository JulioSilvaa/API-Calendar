
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import fs from 'fs';

// Setup environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Try to load .env from root if available (for local dev)
try {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {
  // Ignore in production if .env doesn't exist (env vars validation handles it)
}

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function deploySchema() {
  console.log('Starting database schema deployment...');
  
  if (!process.env.DB_HOST) {
    console.error('❌ DB_HOST not defined. skipping migration.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    const sqlPath = path.resolve(__dirname, '../init.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing init.sql...');
    await client.query(sqlContent);
    
    console.log('✅ Schema deployed successfully!');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('⚠️ Some objects already exist, check init.sql idempotency. Proceeding...');
    } else {
      console.error('❌ Error deploying schema:', err);
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

deploySchema();
