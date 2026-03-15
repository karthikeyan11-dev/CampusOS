const cron = require('node-cron');
const { pool } = require('../config/database');
const { sendNotificationDelivery } = require('../services/notification_delivery.service');

/**
 * Notification Reminder Job
 * Runs every hour
 * Finds notifications where event_date is within 24 hours and reminder hasn't been sent.
 */
const startReminderJob = () => {
  console.log('🕐 Starting Notification Reminder Scheduler (Hourly)...');
  
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('🔍 Checking for upcoming notification deadlines...');
    try {
      // Find published notifications where:
      // 1. event_date is present
      // 2. event_date is between NOW and NOW + 24 hours
      // 3. reminder_sent is false
      const result = await pool.query(
        `SELECT * FROM notifications 
         WHERE status = 'published' 
           AND event_date IS NOT NULL 
           AND event_date > NOW() 
           AND event_date <= NOW() + interval '24 hours'
           AND reminder_sent = false`
      );

      const notifications = result.rows;
      if (notifications.length === 0) {
        console.log('No upcoming deadlines found.');
        return;
      }

      console.log(`Found ${notifications.length} notifications for reminders.`);

      for (const notif of notifications) {
        // Build a reminder title
        const reminderNotif = {
          ...notif,
          title: `⏰ REMINDER: ${notif.title}`
        };

        // Reuse delivery service
        await sendNotificationDelivery(reminderNotif);

        // Update database to mark as sent
        await pool.query(
          'UPDATE notifications SET reminder_sent = true WHERE id = $1',
          [notif.id]
        );
      }

    } catch (error) {
      console.error('Reminder job error:', error.message);
    }
  });
};

module.exports = { startReminderJob };
