import path from 'node:path';
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { root, readJson } from './common.mjs';
import { readReviewStatus, shouldNotify } from './review-api.mjs';

const folder = path.join(root, 'exports/review-watch');
const config = await readJson(path.join(folder, 'config.json'));
if (!Number.isFinite(Date.parse(config.stopAt))) throw new Error('Invalid schedule expiration.');
if (Date.now() >= Date.parse(config.stopAt)) { console.log('Review monitoring period has ended.'); process.exit(0); }
await mkdir(folder, { recursive: true });
const lastFile = path.join(folder, 'latest.json');
let previous;
try { previous = JSON.parse(await readFile(lastFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const checkedAt = new Date().toISOString();
try {
  const result = { checkedAt, ...(await readReviewStatus(config.deviceId, config.clockId)) };
  await appendFile(path.join(folder, 'checks.jsonl'), JSON.stringify(result) + '\n');
  await writeFile(lastFile, JSON.stringify(result, null, 2) + '\n');
  if (shouldNotify(previous, result) && !process.argv.includes('--no-notify')) {
    const code = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $icon = New-Object System.Windows.Forms.NotifyIcon; $icon.Icon = [System.Drawing.SystemIcons]::Information; $icon.Visible = $true; $icon.BalloonTipTitle = $env:MANATOO_REVIEW_TITLE; $icon.BalloonTipText = $env:MANATOO_REVIEW_BODY; $icon.ShowBalloonTip(10000); Start-Sleep -Seconds 10; $icon.Dispose()`;
    const child = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', code], {
      env: { ...process.env, MANATOO_REVIEW_TITLE: 'Puppy Mia clockface review', MANATOO_REVIEW_BODY: `${config.title}: ${result.label}. Details: ${lastFile}` },
      windowsHide: true, detached: true, stdio: 'ignore'
    });
    child.on('error', async error => { await appendFile(path.join(folder, 'checks.jsonl'), JSON.stringify({ checkedAt, notificationError: error.message }) + '\n'); });
    child.unref();
  }
  console.log(`${checkedAt}: ${result.label}`);
  if (result.historyError) console.log(`Review history unavailable: ${result.historyError}`);
} catch (error) {
  await appendFile(path.join(folder, 'checks.jsonl'), JSON.stringify({ checkedAt, error: error.message }) + '\n');
  // Keep the last known status so a transient network failure cannot erase it.
  console.error(error.message);
  process.exitCode = 1;
}
