export const reviewStatusLabels = { 0: 'Private', 1: 'Awaiting your reply', 2: 'Pending Divoom review', 3: 'Published', 4: 'Rejected' };

export async function readReviewStatus(deviceId, clockId, fetchImpl = fetch) {
  if (!Number.isInteger(deviceId) || deviceId <= 0 || !Number.isInteger(clockId) || clockId <= 0) throw new Error('Invalid review target.');
  async function cloud(command, payload = {}) {
    const response = await fetchImpl(`https://appchina.divoom-gz.com/${command}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Command: command, ReturnCode: 0, ReturnMessage: '', DeviceType: 'Frame', DeviceId: deviceId, ...payload }),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Status unknown: HTTP ${response.status}`);
    const data = await response.json();
    if (data.ReturnCode !== 0) throw new Error(`Status unknown: ${JSON.stringify(data)}`);
    return data;
  }
  const data = await cloud('Channel/GetDeviceClockInfo');
  if (!Array.isArray(data.ClockList)) throw new Error('Status unknown: no ClockList.');
  const record = data.ClockList.find(row => Number(row.ClockId) === clockId);
  if (!record) return { status: null, label: 'No online record', history: [] };
  const status = Number(record.Status);
  const result = {
    status, label: reviewStatusLabels[status] ?? `Unknown (${record.Status})`,
    record: { clockId, name: record.ClockName ?? record.Name, categoryId: record.ClassifyId },
    history: []
  };
  try {
    const history = await cloud('Channel/GetUserClockReview', { ClockId: clockId });
    result.history = history.ReviewList ?? [];
  } catch (error) { result.historyError = error.message; }
  return result;
}

export function shouldNotify(previous, current) {
  if (current.status === null || ![0, 1, 2, 3, 4].includes(current.status)) return false;
  if (!previous || previous.status === null) return [1, 3, 4].includes(current.status);
  return previous.status !== current.status;
}
