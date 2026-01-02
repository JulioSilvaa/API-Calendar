/**
 * Storage module for OAuth tokens
 * 
 * This module uses PostgreSQL with pgcrypto encryption for secure token storage.
 * For legacy file-based storage, see storage-legacy.js
 */

// Import PostgreSQL storage with encryption
export {
  saveTokens,
  getUserTokens,
  upsertUserTokens,
  loadTokens,
  deleteUserTokens,
  findUserByGoogleEmail,
  closePool
} from './storage-postgres.js';

