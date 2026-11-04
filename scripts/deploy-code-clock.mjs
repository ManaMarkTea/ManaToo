import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stockApp } from './face-options.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(root + 'exports', { recursive: true });
function call(name, args, output) {
  const result = spawnSync(process.execPath, [root + 'scripts/mcp-call.mjs', name, args ?? '', output ?? ''], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${name} failed. Read device state before retrying a write.`);
}
for (const [command, args] of [[process.execPath, ['scripts/resolve-face.mjs']], ['pwsh', ['-NoProfile', '-File', 'scripts/draw-code-clock.ps1']], [process.execPath, ['scripts/compile-code-clock.mjs']]]) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw result.error ?? new Error('Face build failed.');
}
const metadata = JSON.parse(await readFile(root + 'faces/code-clock/metadata.json', 'utf8'));
const options = JSON.parse(await readFile(root + 'config/face.json', 'utf8'));
if (options.stocks.enabled) {
  const device = JSON.parse(await readFile(root + 'config/device.local.json', 'utf8'));
  const response = await fetch(`http://${device.host}:${device.port ?? 9000}/divoom_api`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Command: 'Sys/GetBrightness' }), signal: AbortSignal.timeout(10000) });
  const identity = await response.json();
  if (!response.ok || identity.ReturnCode !== 0) throw new Error('Could not read target device identity.');
  metadata.AppList = stockApp(options, identity.DeviceId);
}
await writeFile(root + 'exports/select.json', JSON.stringify({ clockId: 60000 }));
await writeFile(root + 'exports/snapshot.json', JSON.stringify({ savePath: root + 'exports/code-clock.bmp' }));
call('watchface_get_device_info', undefined, root + 'exports/device-info.json');
call('watchface_get_local', undefined, root + 'exports/before.json');
for (const item of metadata.ItemList) {
  if (!item.image_addr?.startsWith('asset:')) continue;
  const filename = item.image_addr.slice(6);
  if (!/^[a-z0-9-]+\.(png|webp|bin)$/.test(filename)) throw new Error('Invalid asset name.');
  const request = root + 'exports/upload.json';
  const output = root + 'exports/upload-result.json';
  await writeFile(request, JSON.stringify({ filePath: root + 'faces/code-clock/assets/' + filename, metadata: { Command: 'Device/UploadLocalAsset' } }));
  call('watchface_upload_file', request, output);
  const result = JSON.parse(await readFile(output, 'utf8'));
  const data = JSON.parse(result.content.find(block => block.type === 'text').text);
  const ref = data.responseJson?.FileId;
  if (!ref?.startsWith('local://')) throw new Error('Upload did not return a local asset reference.');
  item.image_addr = ref;
}
await writeFile(root + 'exports/create.json', JSON.stringify({ imagePath: root + 'faces/code-clock/assets/background.jpg', metadata }));
call('watchface_create_local_clock', root + 'exports/create.json', root + 'exports/create-result.json');
call('watchface_set_clock_select', root + 'exports/select.json');
call('watchface_get_local', root + 'exports/select.json', root + 'exports/after.json');
call('watchface_get_screen_snapshot', root + 'exports/snapshot.json', root + 'exports/snapshot-result.json');
