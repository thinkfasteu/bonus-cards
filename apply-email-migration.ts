import 'dotenv/config';
import { pool } from './src/db';

async function checkAndApplyMigration() {
  try {
    console.log('Checking email_receipts table structure...');
    
    // Check current columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'email_receipts' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:', columnsResult.rows);
    
    // Check if migration columns exist
    const hasAttempts = columnsResult.rows.some(row => row.column_name === 'attempts');
    const hasSentAt = columnsResult.rows.some(row => row.column_name === 'sent_at');
    const hasLastError = columnsResult.rows.some(row => row.column_name === 'last_error');
    
    if (hasAttempts && hasSentAt && hasLastError) {
      console.log('✅ Migration columns already exist');
      return;
    }
    
    console.log('Applying email tracking migration...');
    
    // Apply migration manually
    if (!hasAttempts) {
      await pool.query('ALTER TABLE email_receipts ADD COLUMN attempts INT NOT NULL DEFAULT 0');
      console.log('✅ Added attempts column');
    }
    
    if (!hasSentAt) {
      await pool.query('ALTER TABLE email_receipts ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE NULL');
      console.log('✅ Added sent_at column');
    }
    
    if (!hasLastError) {
      await pool.query('ALTER TABLE email_receipts ADD COLUMN last_error TEXT NULL');
      console.log('✅ Added last_error column');
    }
    
    // Add indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_receipts_status_created ON email_receipts(status, created_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_receipts_status_id ON email_receipts(status, id)');
    console.log('✅ Added indexes');
    
    // Add message_id column for tracking sent emails
    const hasMessageId = columnsResult.rows.some(row => row.column_name === 'message_id');
    if (!hasMessageId) {
      await pool.query('ALTER TABLE email_receipts ADD COLUMN message_id TEXT NULL');
      console.log('✅ Added message_id column');
    }
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

checkAndApplyMigration();