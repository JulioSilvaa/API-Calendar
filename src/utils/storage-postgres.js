import pool from './db.js';

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('CRITICAL: ENCRYPTION_KEY not set in environment variables!');
  process.exit(1);
}

// Test database connection (Optional, since pool is lazy)
// pool.query('SELECT NOW()').then(() => console.log('✓ Storage module connected to DB')).catch(err => console.error('Storage DB error', err));

/**
 * Retry helper function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryableError = error.code === 'ECONNREFUSED' || 
                               error.code === 'ETIMEDOUT' || 
                               error.code === 'EAI_AGAIN' ||
                               error.message?.includes('Connection terminated');
      
      if (isLastAttempt || !isRetryableError) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⚠️ Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

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
    const result = await retryWithBackoff(async () => {
      return await pool.query(query, [
        email,
        tokens.access_token,
        ENCRYPTION_KEY,
        tokens.refresh_token || '',
        tokens.scope || '',
        tokens.token_type || 'Bearer',
        tokens.expiry_date ? new Date(tokens.expiry_date) : null
      ]);
    });
    
    console.log(`✓ Tokens saved successfully for ${email}`);
    return result.rows[0];
  } catch (error) {
    console.error(`❌ Error saving tokens for ${email}:`, {
      message: error.message,
      code: error.code,
      host: process.env.DB_HOST
    });
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
  // Using shared pool, responsibility of closing lies elsewhere or app shutdown
  // But we can expose it if needed
  // await pool.end();
}
