const { pool } = require('../config/database');
const emailService = require('./email.service');
const { GATE_PASS_STATUS, COMPLAINT_STATUS } = require('../config/constants');

/**
 * Universal Notification Engine (DB + Email)
 */
const sendNotification = async ({ 
  title, content, targetUserId, targetType = 'personal', 
  type = 'system', postedBy = null, emailParams = null 
}) => {
  try {
    // 1. Persist in Database
    const dbResult = await pool.query(
      `INSERT INTO notifications 
       (title, content, target_user_id, target_type, type, posted_by, status, is_system_generated, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'published', TRUE, NOW())
       RETURNING *`,
      [title, content, targetUserId, targetType, type, postedBy]
    );

    // 2. Send Email if parameters provided
    if (emailParams && emailParams.to) {
      await emailService.sendEmail({
        to: emailParams.to,
        subject: title,
        html: emailParams.html || `<p>${content}</p>`,
      });
    }

    return dbResult.rows[0];
  } catch (err) {
    console.error('❌ Notification Engine Error:', err.message);
  }
};

/**
 * Gate Pass Specific Notifications
 */
const notifyGatePassUpdate = async (gatePass, actorName) => {
  const { id, user_id, status, reason, leave_date, out_time, return_date, return_time } = gatePass;
  
  // Fetch recipient details
  const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [user_id]);
  if (userResult.rows.length === 0) return;
  const user = userResult.rows[0];

  let title = '';
  let content = '';
  let sendEmail = false;

  switch (status) {
    case GATE_PASS_STATUS.APPROVED:
      title = '✅ Gate Pass Approved';
      content = `Great news! Your gate pass request for "${reason}" has been approved. You can leave on ${leave_date} at ${out_time}.`;
      sendEmail = true;
      break;
    case GATE_PASS_STATUS.REJECTED:
      title = '❌ Gate Pass Rejected';
      content = `Your gate pass request for "${reason}" was rejected by ${actorName || 'the department'}.`;
      sendEmail = true;
      break;
    case GATE_PASS_STATUS.HOD_APPROVED:
      title = '⚖️ Gate Pass Pending Warden';
      content = `Your gate pass has been cleared by HOD and is now awaiting Warden's approval.`;
      break;
    default:
      return; 
  }

  return sendNotification({
    title,
    content,
    targetUserId: user_id,
    emailParams: sendEmail ? {
      to: user.email,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6366f1;">${title}</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>${content}</p>
          <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
            <p style="margin: 5px 0;"><strong>Out Date/Time:</strong> ${leave_date} ${out_time}</p>
            ${return_date ? `<p style="margin: 5px 0;"><strong>Return Date/Time:</strong> ${return_date} ${return_time}</p>` : ''}
          </div>
          <p style="color: #666; font-size: 12px;">This is an automated security alert from CampusOS.</p>
        </div>
      `
    } : null
  });
};

/**
 * Complaint Specific Notifications
 */
const notifyComplaintUpdate = async (complaint, actorName) => {
  const { id, title: cTitle, submitted_by, status, current_authority } = complaint;

  // Fetch student details
  const studentResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [submitted_by]);
  if (studentResult.rows.length === 0) return;
  const student = studentResult.rows[0];

  let title = '';
  let content = '';

  switch (status) {
    case COMPLAINT_STATUS.IN_PROGRESS:
      title = '🔍 Complaint In Progress';
      content = `Action has been taken on your complaint: "${cTitle}". It is now ${current_authority}.`;
      break;
    case COMPLAINT_STATUS.RESOLVED:
      title = '✅ Complaint Resolved';
      content = `The issue "${cTitle}" has been marked as resolved. Please confirm and close from your dashboard.`;
      break;
    case COMPLAINT_STATUS.ESCALATED:
      title = '🚨 Complaint Escalated';
      content = `SLA exceeded. Your complaint "${cTitle}" has been escalated to ${current_authority}.`;
      break;
    case COMPLAINT_STATUS.CLOSED:
      title = '⬛ Complaint Closed';
      content = `Your complaint "${cTitle}" is now closed. Thank you for your feedback!`;
      break;
    default:
      return;
  }

  return sendNotification({
    title,
    content,
    targetUserId: submitted_by,
    emailParams: {
      to: student.email,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #8b5cf6;">${title}</h2>
          <p>Hello <strong>${student.name}</strong>,</p>
          <p>${content}</p>
          <p style="margin-top: 20px; font-weight: bold;">Current Ticket Status: ${status.replace(/_/g, ' ').toUpperCase()}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Grievance Redressal System · CampusOS</p>
        </div>
      `
    }
  });
};

module.exports = {
  sendNotification,
  notifyGatePassUpdate,
  notifyComplaintUpdate
};
