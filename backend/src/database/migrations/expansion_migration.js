const { pool } = require('../config/database');

const migrationSQL = `
-- 1. Add missing fields to notifications table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='event_date') THEN
        ALTER TABLE notifications ADD COLUMN event_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='reminder_sent') THEN
        ALTER TABLE notifications ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Add fcm_token to users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='fcm_token') THEN
        ALTER TABLE users ADD COLUMN fcm_token TEXT;
    END IF;
END $$;

-- 3. Add index for reminder job
CREATE INDEX IF NOT EXISTS idx_notifications_reminder ON notifications(status, event_date, reminder_sent);
`;

async function runMigration() {
  console.log('🚀 Running Final Notification Hub Expansion Migration...');
  try {
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.warn('⚠️ Could not connect to database. Make sure PostgreSQL is running.');
      console.warn('Migration SQL for reference:\n', migrationSQL);
    } else {
      console.error('❌ Migration failed:', error.message);
    }
  } finally {
    process.exit();
  }
}

runMigration();
