import pg from 'pg';
const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'api_calendar',
  user: process.env.DB_USER || 'api_calendar_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('CRITICAL: ENCRYPTION_KEY not set in environment variables!');
  process.exit(1);
}

// Test database connection
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

/**
 * Save or update user tokens in the database with encryption
 * @param {string} email - User email
 * @param {object} tokens - Token object containing access_token, refresh_token, etc.
 */
export async function saveTokens(email, tokens) {
  const query = `
    INSERT INTO user_tokens (email, access_token, refresh_token, scope, token_type, expiry_date)
    VALUES ($1, 
      pgp_sym_encrypt($2, $3),
      pgp_sym_encrypt($4, $3),
      $5, $6, $7)
    ON CONFLICT (email) 
    DO UPDATE SET 
      access_token = pgp_sym_encrypt($2, $3),
      refresh_token = pgp_sym_encrypt($4, $3),
      scope = $5,
      token_type = $6,
      expiry_date = $7,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, email, created_at, updated_at
  `;

  try {
    const result = await pool.query(query, [
      email,
      tokens.access_token,
      ENCRYPTION_KEY,
      tokens.refresh_token || '',
      tokens.scope || '',
      tokens.token_type || 'Bearer',
      tokens.expiry_date ? new Date(tokens.expiry_date) : null
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error saving tokens:', error.message);
    throw error;
  }
}

/**
 * Get user tokens from database and decrypt them
 * @param {string} email - User email
 * @returns {object|null} Decrypted token object or null if not found
 */
export async function getUserTokens(email) {
  const query = `
    SELECT 
      email,
      pgp_sym_decrypt(access_token, $2) as access_token,
      pgp_sym_decrypt(refresh_token, $2) as refresh_token,
      scope,
      token_type,
      expiry_date,
      created_at,
      updated_at
    FROM user_tokens
    WHERE email = $1
  `;

  try {
    const result = await pool.query(query, [email, ENCRYPTION_KEY]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      access_token: row.access_token.toString(),
      refresh_token: row.refresh_token.toString(),
      scope: row.scope,
      token_type: row.token_type,
      expiry_date: row.expiry_date ? row.expiry_date.getTime() : null,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (error) {
    console.error('Error getting tokens:', error.message);
    throw error;
  }
}

/**
 * Upsert user tokens (compatibility with old API)
 * @param {string} email - User email
 * @param {object} tokenPayload - Token payload
 * @returns {object} Updated token object
 */
export async function upsertUserTokens(email, tokenPayload) {
  await saveTokens(email, tokenPayload);
  return getUserTokens(email);
}

/**
 * Load all tokens (for migration purposes only - use with caution)
 * @returns {object} Object with email as key and tokens as value
 */
export async function loadTokens() {
  const query = `
    SELECT 
      email,
      pgp_sym_decrypt(access_token, $1) as access_token,
      pgp_sym_decrypt(refresh_token, $1) as refresh_token,
      scope,
      token_type,
      expiry_date
    FROM user_tokens
  `;

  try {
    const result = await pool.query(query, [ENCRYPTION_KEY]);
    
    const tokensByEmail = {};
    result.rows.forEach(row => {
      tokensByEmail[row.email] = {
        access_token: row.access_token.toString(),
        refresh_token: row.refresh_token.toString(),
        scope: row.scope,
        token_type: row.token_type,
        expiry_date: row.expiry_date ? row.expiry_date.getTime() : null
      };
    });
    
    return tokensByEmail;
  } catch (error) {
    console.error('Error loading all tokens:', error.message);
    throw error;
  }
}

/**
 * Delete user tokens
 * @param {string} email - User email
 */
export async function deleteUserTokens(email) {
  const query = 'DELETE FROM user_tokens WHERE email = $1 RETURNING email';
  
  try {
    const result = await pool.query(query, [email]);
    if (result.rows.length > 0) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting tokens:', error.message);
    throw error;
  }
}

/**
 * Close database connection pool
 */
export async function closePool() {
  await pool.end();
  console.log('✓ Database connection pool closed');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});
