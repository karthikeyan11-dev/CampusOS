const { pool } = require('../config/database');

const migrationSQL = `
-- Add missing fields to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add index for reminder job efficiency
CREATE INDEX IF NOT EXISTS idx_notifications_reminder ON notifications(status, event_date, reminder_sent);
`;

async function runMigration() {
  console.log('🚀 Running Notification Hub Expansion Migration...');
  try {
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    process.exit();
  }
}

runMigration();
