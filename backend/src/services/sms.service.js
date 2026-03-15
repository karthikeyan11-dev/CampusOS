const config = require('../config/env');

/**
 * SMS Service — sends SMS via Twilio or logs in dev mode
 */
const sendSMS = async (to, message) => {
  try {
    if (!config.twilio.accountSid || !config.twilio.authToken) {
      console.log(`📱 [DEV MODE] SMS to ${to}: ${message}`);
      return { success: true, dev: true };
    }

    // Dynamic import to avoid errors when Twilio is not installed
    const twilio = require('twilio');
    const client = twilio(config.twilio.accountSid, config.twilio.authToken);

    const result = await client.messages.create({
      body: message,
      from: config.twilio.phoneNumber,
      to,
    });

    console.log(`📱 SMS sent to ${to}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS sending error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send gate pass parent notification
 */
const sendParentSMS = async (parentPhone, studentName, department, outTime, returnTime, reason) => {
  const message = `CampusOS Alert: Your ward ${studentName} (${department}) left campus at ${outTime}. Return time: ${returnTime}. Reason: ${reason}.`;
  return sendSMS(parentPhone, message);
};

/**
 * Send late return alert to parents
 */
const sendLateReturnAlert = async (parentPhone, studentName, expectedReturn) => {
  const message = `CampusOS ALERT: Your ward ${studentName} has not returned to campus. Expected return time was ${expectedReturn}. Please contact the institution.`;
  return sendSMS(parentPhone, message);
};

module.exports = {
  sendSMS,
  sendParentSMS,
  sendLateReturnAlert,
};
