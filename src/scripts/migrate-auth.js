
import pool from '../utils/db.js';

async function migrate() {
  console.log('Starting authentication migration...');

  try {
    // Determine table owner based on environment variables or default to current user
    const tableOwner = process.env.DB_USER || 'api_calendar_user';

    await pool.query('BEGIN');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created users table');

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);
    console.log('✓ Created index on users(email)');

    // Set owner (optional, depending on setup)
    // await pool.query(`ALTER TABLE users OWNER TO ${tableOwner}`);

    await pool.query('COMMIT');
    console.log('✓ Migration completed successfully');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
