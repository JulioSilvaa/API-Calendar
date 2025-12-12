#!/usr/bin/env node

/**
 * Migration script to move tokens from file-based storage to PostgreSQL
 * Usage: node migrate-to-postgres.js
 */

import dotenv from 'dotenv';
import { loadTokens as loadLegacyTokens } from './src/utils/storage-legacy.js';
import { saveTokens as savePostgresTokens } from './src/utils/storage-postgres.js';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

async function migrate() {
  console.log('🔄 Starting migration from file-based to PostgreSQL storage...\n');

  try {
    // Load tokens from legacy file
    console.log('📂 Loading tokens from data/tokens.json...');
    const legacyTokens = await loadLegacyTokens();
    
    const emails = Object.keys(legacyTokens);
    
    if (emails.length === 0) {
      console.log('ℹ️  No tokens found to migrate.');
      return;
    }

    console.log(`✓ Found ${emails.length} user(s) to migrate\n`);

    // Migrate each user's tokens
    let successCount = 0;
    let errorCount = 0;

    for (const email of emails) {
      try {
        const tokens = legacyTokens[email];
        console.log(`  Migrating: ${email.substring(0, 3)}***@${email.split('@')[1]}`);
        
        await savePostgresTokens(email, tokens);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Error migrating ${email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);

    // Ask if user wants to backup and delete the old file
    console.log('\n⚠️  IMPORTANT: After verifying the migration, you should:');
    console.log('   1. Test that the application works with PostgreSQL');
    console.log('   2. Backup the old tokens file: cp data/tokens.json data/tokens.json.backup');
    console.log('   3. Securely delete the old file: shred -vfz -n 10 data/tokens.json');
    console.log('   4. Update src/utils/storage.js to use storage-postgres.js');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✓ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
