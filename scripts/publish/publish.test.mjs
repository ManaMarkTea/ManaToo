import test from 'node:test';
import assert from 'node:assert/strict';
import { clockId, publishCandidate, verifyCandidate, verifyLayout } from './common.mjs';
import { readReviewStatus, shouldNotify } from './review-api.mjs';

const manifest = { deviceId: 123, clockId, title: 'Puppy Mia Time System', categoryId: 30, messageInfo: 'v0.1.0: Initial release.', sourceMetadataSha256: 'source', fileHashes: { 'preview.webp': 'preview' } };
test('default is a dry run and invokes no write callbacks', async () => {
  const forbidden = () => { throw new Error('Unexpected mutation'); };
  const result = await publishCandidate({ manifest, uploadPreview: forbidden, patch: forbidden, share: forbidden });
  assert.equal(result.dryRun, true);
  assert.equal(result.request.ShareToOthers, true);
});
test('submission uploads preview, binds it, then shares in order', async () => {
  const calls = [];
  const result = await publishCandidate({ submit: true, manifest,
    uploadPreview: async () => { calls.push('upload'); return 'local://preview-1.bin'; },
    patch: async payload => { calls.push('patch'); assert.equal(payload.ClockName, manifest.title); assert.equal(payload.PreviewImage, 'local://preview-1.bin'); },
    share: async payload => { calls.push('share'); assert.equal(payload.ClassifyId, 30); return { ReturnCode: 0, Shared: true, ClockId: clockId, ClassifyId: 30, Status: 2 }; }
  });
  assert.deepEqual(calls, ['upload', 'patch', 'share']);
  assert.equal(result.Status, 2);
});
test('a rejected preview cannot reach the patch or share step', async () => {
  await assert.rejects(publishCandidate({ submit: true, manifest, uploadPreview: async () => 'https://example.com/preview', patch: () => assert.fail(), share: () => assert.fail() }), /Invalid local preview/);
});
test('sharing requires an explicit successful confirmation', async () => {
  await assert.rejects(publishCandidate({ submit: true, manifest, uploadPreview: async () => 'local://ok.bin', patch: async () => {}, share: async () => ({ ReturnCode: 0, Shared: false, ClockId: clockId }) }), /did not confirm/);
});
test('private upload is not accepted as successful public submission', async () => {
  await assert.rejects(publishCandidate({ submit: true, manifest, uploadPreview: async () => 'local://ok.bin', patch: async () => {}, share: async () => ({ ReturnCode: 0, Shared: true, ClockId: clockId, ClassifyId: 30, Status: 0 }) }), /did not confirm public sharing/);
});
test('candidate cannot silently target another device or changed source/preview', () => {
  assert.doesNotThrow(() => verifyCandidate(manifest, 123, 'source', { 'preview.webp': 'preview' }));
  assert.throws(() => verifyCandidate(manifest, 456, 'source', { 'preview.webp': 'preview' }), /different device/);
  assert.throws(() => verifyCandidate(manifest, 123, 'changed', { 'preview.webp': 'preview' }), /Source changed/);
  assert.throws(() => verifyCandidate(manifest, 123, 'source', { 'preview.webp': 'changed' }), /Candidate file changed/);
});
test('device layout must match, while normalized colors are accepted', () => {
  const source = { ItemList: [{ item_id: 'time', disp: 4, x: 12, color_1: '#ABCDEF' }] };
  assert.doesNotThrow(() => verifyLayout(source, { ClockId: clockId, ItemList: [{ ...source.ItemList[0], color_1: '#abcdef' }] }));
  assert.throws(() => verifyLayout(source, { ClockId: clockId, ItemList: [{ ...source.ItemList[0], x: 13 }] }), /differs/);
});
test('review watcher notifies on status changes, not unchanged pending state', () => {
  assert.equal(shouldNotify(undefined, { status: 2 }), false);
  assert.equal(shouldNotify({ status: 2 }, { status: 2 }), false);
  assert.equal(shouldNotify({ status: 2 }, { status: 3 }), true);
  assert.equal(shouldNotify({ status: 2 }, { status: 1 }), true);
  assert.equal(shouldNotify({ status: 2 }, { status: null }), false);
});
test('review check matches the intended clock and tolerates a history failure', async () => {
  let calls = 0;
  const fetchMock = async (url, options) => {
    calls++;
    assert.equal(JSON.parse(options.body).DeviceId, 123);
    if (calls === 1) return { ok: true, json: async () => ({ ReturnCode: 0, ClockList: [{ ClockId: 999, Status: 3 }, { ClockId: clockId, Status: 2 }] }) };
    throw new Error('History unavailable');
  };
  const result = await readReviewStatus(123, clockId, fetchMock);
  assert.equal(result.status, 2);
  assert.equal(result.label, 'Pending Divoom review');
  assert.match(result.historyError, /History unavailable/);
});
