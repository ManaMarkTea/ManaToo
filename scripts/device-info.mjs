import { readFile } from 'node:fs/promises';
const config = JSON.parse(await readFile(new URL('../config/device.local.json', import.meta.url), 'utf8').catch(() => {
  throw new Error('Copy config/device.example.json to config/device.local.json and set your device IP.');
}));
for (const Command of ['Device/GetHardwareVersion', 'Device/GetLanCapabilities']) {
  const response = await fetch(`http://${config.host}:${config.port ?? 9000}/divoom_api`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Command }), signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${Command}`);
  const info = await response.json();
  if (info.ReturnCode !== 0) throw new Error(JSON.stringify(info));
  console.log(JSON.stringify(info, null, 2));
  if (Command === 'Device/GetHardwareVersion' && info.Hardware !== 530) throw new Error('Expected AstroToo hardware 530.');
}
