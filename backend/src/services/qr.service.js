const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a signed QR code for a gate pass
 * The QR contains a JWT token with pass details
 */
const generateGatePassQR = async (gatePass) => {
  // Create a JWT token with gate pass info
  const qrPayload = {
    passId: gatePass.id,
    userId: gatePass.user_id,
    type: 'gate_pass',
    leaveDate: gatePass.leave_date,
    outTime: gatePass.out_time,
    returnDate: gatePass.return_date,
    returnTime: gatePass.return_time,
  };

  const qrToken = jwt.sign(qrPayload, config.jwt.qrSecret, {
    expiresIn: '24h',
  });

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(qrToken, {
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  return { qrToken, qrDataUrl };
};

/**
 * Verify a scanned QR code token
 */
const verifyGatePassQR = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.qrSecret);
    return { valid: true, data: decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Gate pass QR has expired.' };
    }
    return { valid: false, error: 'Invalid QR code.' };
  }
};

/**
 * Generate QR for resource booking confirmation
 */
const generateBookingQR = async (booking) => {
  const payload = {
    bookingId: booking.id,
    resourceId: booking.resource_id,
    type: 'booking',
    startTime: booking.start_time,
    endTime: booking.end_time,
  };

  const token = jwt.sign(payload, config.jwt.qrSecret, { expiresIn: '12h' });

  const qrDataUrl = await QRCode.toDataURL(token, {
    width: 250,
    margin: 2,
    errorCorrectionLevel: 'M',
  });

  return { token, qrDataUrl };
};

module.exports = {
  generateGatePassQR,
  verifyGatePassQR,
  generateBookingQR,
};
