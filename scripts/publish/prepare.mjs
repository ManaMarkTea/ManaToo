import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { root, clockId, readJson, saveJson, sha256, mcp, lan, verifyLayout, categoryCatalog } from './common.mjs';

const project = await readJson(path.join(root, 'package.json'));
if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(project.version)) throw new Error('Invalid project version.');
const listing = await readJson(path.join(root, 'config/publish.json'));
const output = path.join(root, 'exports/publish', `v${project.version}`);
await mkdir(output, { recursive: true });
const metadataFile = path.join(root, 'faces/code-clock/metadata.json');
const metadataBytes = await readFile(metadataFile);
const metadata = JSON.parse(metadataBytes);
await mcp('watchface_get_device_info', {}, path.join(output, 'device-info.json'));
const capabilities = await lan('Device/GetLanCapabilities');
if (capabilities.Model !== 'astrotoo' || capabilities.SupportsClockShare !== true) throw new Error('This device does not support AstroToo sharing.');
const hardware = await lan('Device/GetHardwareVersion');
if (hardware.Hardware !== 530) throw new Error('Expected AstroToo hardware 530.');
const identity = await lan('Sys/GetBrightness');
const deviceId = identity.DeviceId;
if (!Number.isInteger(deviceId) || deviceId <= 0) throw new Error('Device identity unavailable.');
const categories = await categoryCatalog(deviceId);
const category = categories.ClassifyList.find(row => Number(row.ClassifyId) === listing.categoryId);
if (!category) throw new Error('Configured category is not in the current AstroToo catalog.');
await saveJson(path.join(output, 'categories.json'), categories);
const deployed = (await mcp('watchface_get_local', { clockId }, path.join(output, 'device-layout.json'))).responseJson;
verifyLayout(metadata, deployed);
const current = await lan('Device/GetLocalClockInfo', { UseCurrentDisplayClock: 1 });
if (current.ClockId !== clockId) throw new Error('Select Puppy Mia Time System on the device before preparing its preview.');
await mcp('watchface_get_screen_snapshot', { savePath: path.join(output, 'capture.bmp') }, path.join(output, 'snapshot.json'));
const conversion = spawnSync('python', [path.join(root, 'scripts/publish/preview.py'), path.join(output, 'capture.bmp'), output], { stdio: 'inherit' });
if (conversion.error) throw conversion.error;
if (conversion.status !== 0) throw new Error('Preview conversion failed. Install requirements-art.txt.');

// This directory can also be imported using the official editor's folder import.
const editor = { ...metadata, ClockId: 0, ClockName: listing.title, NameEn: listing.title, NameCn: listing.title, DeviceImageUrl: 'background.jpg', AppImageUrl: 'preview.webp' };
const fileHashes = {};
const assets = new Set(['background.jpg']);
for (const item of editor.ItemList) {
  if (!item.image_addr?.startsWith('asset:')) continue;
  const filename = item.image_addr.slice(6);
  if (!/^[a-z0-9-]+\.(png|webp|bin)$/i.test(filename)) throw new Error('Invalid asset leaf.');
  assets.add(filename);
}
for (const filename of assets) {
  const source = path.join(root, 'faces/code-clock/assets', filename);
  await copyFile(source, path.join(output, filename));
  fileHashes[filename] = sha256(await readFile(source));
}
editor.ItemList = editor.ItemList.map(item => ({ ...item, image_addr: item.image_addr?.replace(/^asset:/, '') }));
await saveJson(path.join(output, 'clock.json'), editor);
for (const filename of ['preview.png', 'preview.webp', 'clock.json']) fileHashes[filename] = sha256(await readFile(path.join(output, filename)));
const manifest = {
  title: listing.title, version: project.version, categoryId: listing.categoryId, categoryName: category.ClassifyNameEn || category.ClassifyName,
  description: listing.description, messageInfo: `v${project.version}: ${listing.releaseNotes}`,
  deviceId, clockId, preparedAt: new Date().toISOString(), firmware: hardware.FirmwareVersion,
  sourceMetadataSha256: sha256(metadataBytes), fileHashes,
  preview: 'preview.webp', shareToOthers: true
};
await saveJson(path.join(output, 'manifest.json'), manifest);
await saveJson(path.join(root, 'exports/publish/current.json'), { directory: `v${project.version}` });
console.log(`Prepared ${manifest.title} v${manifest.version}\nCategory: ${manifest.categoryName} (${manifest.categoryId})\nPreview: ${path.join(output, 'preview.png')}\nNo public submission made. Run npm run publish:check to validate.`);
