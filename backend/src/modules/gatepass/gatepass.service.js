const getGatePassTimeWindow = (gatePass) => {
  const now = new Date();
  const outDateTime = new Date(`${gatePass.leave_date}T${gatePass.out_time}`);
  
  const generationVisibleTime = new Date(outDateTime.getTime() - 30 * 60 * 1000); // 30 mins before
  const validStartTime = new Date(outDateTime.getTime() - 30 * 60 * 1000); // 30 mins before
  const validEndTime = new Date(outDateTime.getTime() + 60 * 60 * 1000);   // 1 hour after

  let scanStatus = 'VALID';
  if (now < validStartTime) scanStatus = 'EARLY';
  if (now > validEndTime) scanStatus = 'EXPIRED';

  return {
    now,
    outDateTime,
    generationVisibleTime,
    validStartTime,
    validEndTime,
    scanStatus,
    canShowQR: now >= generationVisibleTime,
    canExit: now >= validStartTime && now <= validEndTime
  };
};

module.exports = {
  getGatePassTimeWindow
};
