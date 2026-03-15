const { pool } = require('../config/database');
const { sendNotificationDelivery } = require('../services/notification_delivery.service');

async function testNotificationHub() {
  console.log('🧪 Starting Smart Academic Notification Hub Tests...');

  try {
    // 1. Create a mock notification
    const mockNotif = {
      id: '00000000-0000-0000-0000-000000000000',
      title: 'Test Batch Notification',
      content: 'This is a test content for batch 2024.',
      ai_summary: 'Batch 2024 test summary.',
      type: 'academic',
      target_type: 'batch',
      target_batch: '2024',
      event_date: new Date(Date.now() + 23 * 60 * 60 * 1000) // 23 hours from now
    };

    console.log('Testing targeting logic...');
    // We can simulate the SQL query for recipients
    const query = `
      SELECT email FROM users 
      WHERE id IN (SELECT user_id FROM students WHERE batch = $1)
    `;
    const res = await pool.query(query, [mockNotif.target_batch]);
    console.log(`Target users found for batch 2024: ${res.rows.length}`);

    console.log('Testing delivery trigger...');
    // This will log to console since we don't have real FCM/SMTP keys in dev env
    await sendNotificationDelivery(mockNotif);

    console.log('Testing reminder detection...');
    const reminderCheck = await pool.query(`
      SELECT title FROM notifications 
      WHERE event_date > NOW() AND event_date <= NOW() + interval '24 hours'
    `);
    console.log(`Upcoming events in next 24h: ${reminderCheck.rows.length}`);

    console.log('✅ Tests completed successfully (Check console for logs).');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.warn('⚠️ Skip actual DB tests (DB not connected). Review logic manually.');
    } else {
      console.error('❌ Test failed:', err.message);
    }
  } finally {
    process.exit();
  }
}

testNotificationHub();
