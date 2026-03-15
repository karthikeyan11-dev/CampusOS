const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
};

/**
 * Send an email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!config.smtp.user || !config.smtp.pass) {
      console.log(`📧 [DEV MODE] Email to: ${to}, Subject: ${subject}`);
      return { success: true, dev: true };
    }

    const transport = getTransporter();
    const result = await transport.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text,
    });

    console.log(`📧 Email sent to ${to}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send gate pass notification email
 */
const sendGatePassEmail = async (to, studentName, reason, outTime, returnTime) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🏫 CampusOS Gate Pass</h1>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
        <h2>Gate Pass Approved</h2>
        <p><strong>Student:</strong> ${studentName}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Out Time:</strong> ${outTime}</p>
        ${returnTime ? `<p><strong>Return Time:</strong> ${returnTime}</p>` : ''}
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated notification from CampusOS.</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject: `Gate Pass: ${studentName} - ${reason}`, html });
};

/**
 * Send account approval email
 */
const sendApprovalEmail = async (to, name, status) => {
  const isApproved = status === 'approved';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${isApproved ? '#10b981' : '#ef4444'}; padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🏫 CampusOS</h1>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
        <h2>Account ${isApproved ? 'Approved ✅' : 'Rejected ❌'}</h2>
        <p>Hello ${name},</p>
        <p>Your CampusOS registration has been <strong>${status}</strong>.</p>
        ${isApproved ? '<p>You can now log in to the platform.</p>' : '<p>Please contact the administration for more details.</p>'}
      </div>
    </div>
  `;

  return sendEmail({ to, subject: `CampusOS: Account ${status}`, html });
};

module.exports = {
  sendEmail,
  sendGatePassEmail,
  sendApprovalEmail,
};
