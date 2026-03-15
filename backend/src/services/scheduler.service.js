const { pool } = require('../config/database');
const { COMPLAINT_STATUS, GATE_PASS_STATUS, ESCALATION_SLA } = require('../config/constants');
const { sendLateReturnAlert } = require('./sms.service');
const { sendNotificationDelivery } = require('./notification_delivery.service');

/**
 * Scheduled Jobs Service
 * Runs periodic checks for:
 * 1. Complaint SLA auto-escalation
 * 2. Gate pass late return detection + parent alerts
 * 3. Gate pass auto-expiry (approved but unused)
 * 4. Notification reminders
 */

const INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes

/**
 * Job 1: Auto-escalate complaints that have passed their SLA deadline
 */
const escalateOverdueComplaints = async () => {
  try {
    const result = await pool.query(
      `UPDATE complaints
       SET status = 'escalated',
           escalation_level = escalation_level + 1,
           escalated_at = NOW(),
           updated_at = NOW()
       WHERE status IN ('open', 'in_progress')
         AND sla_deadline IS NOT NULL
         AND sla_deadline < NOW()
       RETURNING id, title, priority, sla_deadline`
    );

    if (result.rows.length > 0) {
      console.log(`⏰ Auto-escalated ${result.rows.length} overdue complaint(s):`);
      result.rows.forEach(c => {
        console.log(`   - [${c.priority}] ${c.title} (SLA was ${c.sla_deadline})`);
      });
    }
  } catch (error) {
    console.error('Escalation job error:', error.message);
  }
};

/**
 * Job 2: Detect late returns and send parent SMS alerts
 * Triggers when: gate pass is 'exited' AND current time > return_date + return_time + 1 hour
 * 
 * IMPORTANT: Only checks 'exited' passes (NOT 'approved' or other statuses)
 */
const detectLateReturns = async () => {
  try {
    const result = await pool.query(
      `SELECT gp.id, gp.user_id, gp.return_date, gp.return_time, gp.late_alert_sent,
              u.name as student_name, d.name as department_name,
              s.father_phone, s.mother_phone
       FROM gate_passes gp
       JOIN users u ON gp.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE gp.status = 'exited'
         AND gp.late_alert_sent = false
         AND gp.return_date IS NOT NULL
         AND gp.return_time IS NOT NULL
         AND gp.return_scanned_at IS NULL
         AND (gp.return_date::text || ' ' || gp.return_time::text)::timestamp + interval '1 hour' < NOW()`
    );

    for (const gp of result.rows) {
      const parentPhone = gp.father_phone || gp.mother_phone;
      if (parentPhone) {
        const expectedReturn = `${gp.return_date} ${gp.return_time}`;
        try {
          await sendLateReturnAlert(parentPhone, gp.student_name, expectedReturn);
          console.log(`🚨 Late return alert sent for ${gp.student_name} (pass ${gp.id})`);
        } catch (smsErr) {
          console.error(`SMS alert failed for ${gp.student_name}:`, smsErr.message);
        }
      }

      // Mark alert as sent
      await pool.query(
        'UPDATE gate_passes SET late_alert_sent = true WHERE id = $1',
        [gp.id]
      );
    }

    if (result.rows.length > 0) {
      console.log(`⏰ Processed ${result.rows.length} late return alert(s)`);
    }
  } catch (error) {
    console.error('Late return detection error:', error.message);
  }
};

/**
 * Job 3: Auto-expire approved gate passes that were never scanned
 * 
 * RULES (from Phase 11):
 *   - Only expire when: status = 'approved' AND exit_scanned_at IS NULL AND current_time > out_time + 1 hour
 *   - NEVER expire passes where status = 'exited'
 */
const expireUnusedGatePasses = async () => {
  try {
    const result = await pool.query(
       `UPDATE gate_passes
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'approved'
          AND exit_scanned_at IS NULL
          AND (leave_date::text || ' ' || out_time::text)::timestamp + interval '1 hour' < NOW()
        RETURNING id`
    );

    if (result.rows.length > 0) {
      console.log(`⏰ Auto-expired ${result.rows.length} unused gate pass(es)`);
    }
  } catch (error) {
    console.error('Gate pass expiry job error:', error.message);
  }
};

/**
 * Job 4: Send reminders for upcoming notification events/deadlines
 * Rule: 24 hours before event_date
 */
const sendNotificationReminders = async () => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE status = 'published' 
         AND event_date IS NOT NULL 
         AND event_date > NOW() 
         AND event_date <= NOW() + interval '24 hours'
         AND reminder_sent = false`
    );

    for (const notif of result.rows) {
      try {
        await sendNotificationDelivery({
          ...notif,
          title: `⏰ REMINDER: ${notif.title}`
        });
        await pool.query('UPDATE notifications SET reminder_sent = true WHERE id = $1', [notif.id]);
      } catch (deliveryErr) {
        console.error(`Reminder delivery failed for notification ${notif.id}:`, deliveryErr.message);
      }
    }
    
    if (result.rows.length > 0) {
      console.log(`⏰ Sent ${result.rows.length} notification reminder(s)`);
    }
  } catch (error) {
    console.error('Notification reminder job error:', error.message);
  }
};

/**
 * Start all scheduled jobs
 */
const startScheduler = () => {
  console.log('🕐 Starting background scheduler (interval: 5 minutes)...');

  // Run immediately on startup
  runAllJobs();

  // Then run periodically
  setInterval(runAllJobs, INTERVAL_MS);
};

const runAllJobs = async () => {
  await escalateOverdueComplaints();
  await detectLateReturns();
  await expireUnusedGatePasses();
  await sendNotificationReminders();
};

module.exports = {
  startScheduler,
  escalateOverdueComplaints,
  detectLateReturns,
  expireUnusedGatePasses,
};
