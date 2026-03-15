const { pool } = require('../config/database');
const { sendEmail } = require('./email.service');
const { ROLES } = require('../config/constants');
// Admin will be initialized here
const admin = require('firebase-admin');

// Note: In a real app, you'd provide the service account key here
// For now, we initialize if the env vars are present
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.error('Firebase initialization error:', error.message);
}

const sendNotificationDelivery = async (notification) => {
  try {
    const { 
      id, title, content, ai_summary, type, 
      target_type, target_department_id, target_batch, target_class_id,
      event_date 
    } = notification;

    // 1. Fetch recipients
    let query = `SELECT id, email, fcm_token FROM users WHERE status = 'approved'`;
    let params = [];

    if (target_type === 'department') {
      query += ` AND department_id = $1`;
      params.push(target_department_id);
    } else if (target_type === 'batch') {
      query += ` AND id IN (SELECT user_id FROM students WHERE batch = $1)`;
      params.push(target_batch);
    } else if (target_type === 'class') {
      query += ` AND id IN (SELECT user_id FROM students WHERE class_id = $1)`;
      params.push(target_class_id);
    } else if (target_type === 'hosteller') {
      query += ` AND id IN (SELECT user_id FROM students WHERE residence_type = 'hosteller')`;
    } else if (target_type === 'day_scholar') {
      query += ` AND id IN (SELECT user_id FROM students WHERE residence_type = 'day_scholar')`;
    } else if (target_type === 'faculty') {
      query += ` AND role = 'faculty'`;
    }

    const recipientsResult = await pool.query(query, params);
    const recipients = recipientsResult.rows;

    if (recipients.length === 0) return;

    // 2. Send Emails
    const emailPromises = recipients.map(user => {
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #4a90e2;">🏫 CampusOS Notification</h2>
          <hr/>
          <h3>${title}</h3>
          <p><strong>Category:</strong> ${type.toUpperCase()}</p>
          ${event_date ? `<p><strong>Event Date:</strong> ${new Date(event_date).toLocaleString()}</p>` : ''}
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            ${content}
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard/notifications/${id}" 
             style="display: inline-block; background: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
             View in App
          </a>
          <p style="font-size: 12px; color: #888; margin-top: 30px;">
            This is an automated notification from your Campus Management System.
          </p>
        </div>
      `;
      return sendEmail({
        to: user.email,
        subject: `[CampusOS] ${title}`,
        html
      });
    });

    // 3. Send Push Notifications (FCM)
    const pushRecipients = recipients.filter(u => u.fcm_token);
    let pushPromise = Promise.resolve();
    
    if (pushRecipients.length > 0 && admin.apps.length > 0) {
      const tokens = pushRecipients.map(u => u.fcm_token);
      const message = {
        notification: {
          title: title,
          body: ai_summary || content.substring(0, 100) + '...'
        },
        data: {
          notification_id: id.toString(),
          category: type
        },
        tokens: tokens
      };
      pushPromise = admin.messaging().sendMulticast(message);
    }

    await Promise.allSettled([...emailPromises, pushPromise]);
    console.log(`✅ Notification delivered to ${recipients.length} recipients.`);

  } catch (error) {
    console.error('Notification delivery error:', error.message);
  }
};

module.exports = { sendNotificationDelivery };
