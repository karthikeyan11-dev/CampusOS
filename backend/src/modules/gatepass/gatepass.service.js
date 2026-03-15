const { GATE_PASS_STATUS } = require('../../config/constants');

/**
 * Service to handle Gate Pass time logic
 */
const getGatePassTimeWindow = (gatePass) => {
  const now = new Date();
  const outDateTime = new Date(`${gatePass.leave_date}T${gatePass.out_time}`);
  
  const generationTime = new Date(outDateTime.getTime() - 60 * 60 * 1000); // 1 hour before
  const validStartTime = new Date(outDateTime.getTime() - 30 * 60 * 1000); // 30 mins before
  const validEndTime = new Date(outDateTime.getTime() + 60 * 60 * 1000);   // 1 hour after

  let scanStatus = 'VALID';
  if (now < validStartTime) scanStatus = 'EARLY';
  if (now > validEndTime) scanStatus = 'EXPIRED';

  return {
    now,
    outDateTime,
    generationTime,
    validStartTime,
    validEndTime,
    scanStatus,
    canShowQR: now >= generationTime,
    canExit: now >= validStartTime && now <= validEndTime
  };
};

module.exports = {
  getGatePassTimeWindow
};
