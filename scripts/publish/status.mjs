import path from 'node:path';
import { root, clockId, lan, saveJson, statuses } from './common.mjs';
import { mkdir } from 'node:fs/promises';

const identity = await lan('Sys/GetBrightness');
if (!Number.isInteger(identity.DeviceId) || identity.DeviceId <= 0) throw new Error('Device identity unavailable.');
async function cloud(command, payload) {
  const response = await fetch(`https://appchina.divoom-gz.com/${command}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Command: command, ReturnCode: 0, ReturnMessage: '', DeviceType: 'Frame', DeviceId: identity.DeviceId, ...payload }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Status unknown: HTTP ${response.status}`);
  const data = await response.json();
  if (data.ReturnCode !== 0) throw new Error(`Status unknown: ${JSON.stringify(data)}`);
  return data;
}
const data = await cloud('Channel/GetDeviceClockInfo', {});
if (!Array.isArray(data.ClockList)) throw new Error('Status unknown: server did not return ClockList.');
const row = data.ClockList.find(row => Number(row.ClockId) === clockId);
const output = path.join(root, 'exports/publish');
await mkdir(output, { recursive: true });
await saveJson(path.join(output, 'online-status.json'), data);
if (!row) console.log('No online record returned for this device and custom face.');
else {
  console.log(`${row.ClockName ?? 'Puppy Mia Time System'}: ${statuses[Number(row.Status)] ?? `Unknown (${row.Status})`}`);
  const history = await cloud('Channel/GetUserClockReview', { ClockId: clockId });
  await saveJson(path.join(output, 'review-history.json'), history);
  for (const message of history.ReviewList ?? []) console.log(JSON.stringify(message));
}
