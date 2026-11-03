import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const clockId = 60000;
export const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
export const saveJson = (file, data) => writeFile(file, JSON.stringify(data, null, 2) + '\n');
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const statuses = { 0: 'Private', 1: 'Awaiting user reply', 2: 'Pending Divoom review', 3: 'Published', 4: 'Rejected' };

export async function mcp(name, args, output) {
  const input = output + '.request.json';
  await saveJson(input, args);
  const processResult = spawnSync(process.execPath, [path.join(root, 'scripts/mcp-call.mjs'), name, input, output], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
  if (processResult.error) throw processResult.error;
  const result = await readJson(output);
  const text = result.content?.find(block => block.type === 'text')?.text;
  if (processResult.status !== 0 || result.isError) throw new Error(text || `${name} failed`);
  return JSON.parse(text);
}

export async function lan(command, payload = {}, timeoutMs = 45000) {
  const target = await readJson(path.join(root, 'config/device.local.json'));
  const response = await fetch(`http://${target.host}:${target.port ?? 9000}/divoom_api`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Command: command, ReturnCode: 0, ReturnMessage: '', DeviceType: 'AstroToo', ...payload }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`${command}: HTTP ${response.status}`);
  const data = await response.json();
  if (data.ReturnCode !== 0) throw new Error(`${command}: ${JSON.stringify(data)}`);
  return data;
}

export async function categoryCatalog(deviceId) {
  const body = JSON.stringify({ Command: 'Channel/StoreClockGetClassify', ReturnCode: 0, DeviceType: 'Frame', DeviceId: deviceId, Language: 'en', ClassifyList: [] });
  let lastError;
  // Official editor documents HTTP as the fallback when port 9506 TLS fails.
  for (const scheme of ['https', 'http']) {
    try {
      const response = await fetch(`${scheme}://appchina.divoom-gz.com:9506/Channel/StoreClockGetClassify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.ReturnCode !== 0 || !Array.isArray(data.ClassifyList)) throw new Error('Invalid category response.');
      return data;
    } catch (error) { lastError = error; }
  }
  throw new Error(`Could not verify the public category catalog: ${lastError.message}`);
}

const itemFields = ['item_id', 'disp', 'font', 'x', 'y', 'w', 'h', 'size', 'alig', 'sep', 'angle', 'hier', 'transp', 'animation', 'image_id', 'color_1', 'color_2'];
export function comparableItems(items) {
  return items.map(item => Object.fromEntries(itemFields.map(key => [key, key.startsWith('color_') ? item[key]?.toUpperCase() : item[key]])));
}
export function verifyLayout(source, deployed) {
  if (deployed.ClockId !== clockId || !deployed.ItemList?.length) throw new Error('Managed watchface is missing or empty.');
  if (JSON.stringify(comparableItems(source.ItemList)) !== JSON.stringify(comparableItems(deployed.ItemList))) {
    throw new Error('Device layout differs from the source. Run face:deploy, then publish:prepare again.');
  }
}
export function verifyCandidate(manifest, deviceId, metadataHash, fileHashes) {
  if (manifest.deviceId !== deviceId || manifest.clockId !== clockId) throw new Error('Candidate belongs to a different device or slot.');
  if (manifest.sourceMetadataSha256 !== metadataHash) throw new Error('Source changed after preparation. Prepare again.');
  if (!Number.isInteger(manifest.categoryId) || manifest.categoryId <= 0) throw new Error('A public category is required.');
  if (!manifest.title?.trim() || Buffer.byteLength(manifest.title, 'utf8') > 63) throw new Error('Title must be 1–63 UTF-8 bytes.');
  if (!manifest.messageInfo?.trim() || manifest.messageInfo.length > 500) throw new Error('Release notes must be 1–500 characters.');
  for (const [file, expected] of Object.entries(manifest.fileHashes)) {
    if (fileHashes[file] !== expected) throw new Error(`Candidate file changed: ${file}`);
  }
}

// Dry runs cannot stage assets, patch device metadata, or call the sharing API.
export async function publishCandidate({ submit = false, manifest, uploadPreview, patch, share }) {
  const request = { ClockId: clockId, ShareToOthers: true, ClassifyId: manifest.categoryId, MessageInfo: manifest.messageInfo };
  if (!submit) return { dryRun: true, request };
  const preview = await uploadPreview();
  if (!/^local:\/\/[A-Za-z0-9_.-]+$/.test(preview)) throw new Error('Invalid local preview reference.');
  await patch({ ClockId: clockId, ClockName: manifest.title, PreviewImage: preview });
  const result = await share(request);
  if (result.ReturnCode !== 0 || result.Shared !== true || result.ClockId !== clockId || result.ClassifyId !== manifest.categoryId || ![1, 2, 3].includes(result.Status)) throw new Error('Device did not confirm public sharing. Check status before retrying.');
  return result;
}
