import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { root, clockId, readJson, saveJson, sha256, mcp, lan, verifyLayout, verifyCandidate, publishCandidate, statuses, categoryCatalog } from './common.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--submit')) throw new Error('Usage: submit.mjs [--submit]. Without --submit this only validates.');
const submit = args.includes('--submit');
const pointer = await readJson(path.join(root, 'exports/publish/current.json'));
if (!/^v\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(pointer.directory)) throw new Error('Invalid candidate directory.');
const directory = path.join(root, 'exports/publish', pointer.directory);
const manifest = await readJson(path.join(directory, 'manifest.json'));
const project = await readJson(path.join(root, 'package.json'));
const listing = await readJson(path.join(root, 'config/publish.json'));
if (manifest.version !== project.version || manifest.title !== listing.title || manifest.categoryId !== listing.categoryId || manifest.messageInfo !== `v${project.version}: ${listing.releaseNotes}` || manifest.description !== listing.description) {
  throw new Error('Version or listing changed after preparation. Prepare again.');
}
const metadataBytes = await readFile(path.join(root, 'faces/code-clock/metadata.json'));
const hashes = {};
for (const filename of Object.keys(manifest.fileHashes)) {
  if (!/^[a-z0-9.-]+$/i.test(filename) || filename.startsWith('.')) throw new Error('Invalid candidate filename.');
  hashes[filename] = sha256(await readFile(path.join(directory, filename)));
  if (!['preview.png', 'preview.webp', 'clock.json'].includes(filename)) {
    if (sha256(await readFile(path.join(root, 'faces/code-clock/assets', filename))) !== manifest.fileHashes[filename]) throw new Error(`Source asset changed: ${filename}. Prepare again.`);
  }
}
const hardware = await lan('Device/GetHardwareVersion');
const capabilities = await lan('Device/GetLanCapabilities');
if (hardware.Hardware !== 530 || capabilities.SupportsClockShare !== true) throw new Error('Expected an AstroToo with watchface sharing support.');
const identity = await lan('Sys/GetBrightness');
verifyCandidate(manifest, identity.DeviceId, sha256(metadataBytes), hashes);
const categories = await categoryCatalog(identity.DeviceId);
if (!categories.ClassifyList.some(row => Number(row.ClassifyId) === manifest.categoryId)) throw new Error('Public category no longer exists. Prepare again.');
const live = await lan('Device/GetLocalClockInfo', { ClockId: clockId });
verifyLayout(JSON.parse(metadataBytes), live);
console.log(`${submit ? 'Submitting public review request' : 'Dry run'}: ${manifest.title} v${manifest.version}\nCategory: ${manifest.categoryName} (${manifest.categoryId})\nNotes: ${manifest.messageInfo}`);

const receipts = path.join(root, 'exports/publish/receipts');
await mkdir(receipts, { recursive: true });
let sharingStarted = false;
try {
  const result = await publishCandidate({ submit, manifest,
    uploadPreview: async () => {
      const upload = await mcp('watchface_upload_file', { filePath: path.join(directory, manifest.preview), metadata: {} }, path.join(receipts, 'preview-upload.json'));
      return upload.responseJson?.FileId;
    },
    patch: async payload => {
      await saveJson(path.join(receipts, 'before-preview-patch.json'), live);
      await saveJson(path.join(receipts, 'preview-patch-result.json'), await lan('Device/PatchLocalClockInfo', { DeviceId: manifest.deviceId, ...payload }));
    },
    share: async payload => {
      sharingStarted = true;
      await saveJson(path.join(receipts, 'share-request.json'), { deviceId: manifest.deviceId, ...payload });
      const response = await lan('Device/ShareLocalClock', { DeviceId: manifest.deviceId, ...payload }, 180000);
      await saveJson(path.join(receipts, 'share-response.json'), response);
      return response;
    }
  });
  if (!submit) console.log('Ready. No device writes or sharing requests were sent.');
  else {
    await saveJson(path.join(receipts, 'share-result.json'), result);
    console.log(`Device confirmed sharing. Status: ${statuses[result.Status] ?? `Unknown (${result.Status})`}. Pending review does not mean published. Run npm run publish:status.`);
  }
} catch (error) {
  if (sharingStarted) console.error('The share request was sent, but completion was not confirmed. Run publish:status before retrying; do not resubmit automatically.');
  throw error;
}
