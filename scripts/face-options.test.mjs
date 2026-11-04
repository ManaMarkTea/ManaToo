import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveLayout, stockApp, validateOptions } from './face-options.mjs';
const source = JSON.parse(await readFile(new URL('../faces/code-clock/layout.json', import.meta.url), 'utf8'));
test('all panel combinations preserve geometry and remove disabled native fields', () => {
  for (const music of [false, true]) for (const weather of [false, true]) for (const enabled of [false, true]) {
    const options = { music, weather, stocks: { enabled, symbols: ['AAPL', 'MSFT'] } };
    const layout = resolveLayout(source, options);
    assert.deepEqual(layout.panels.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })), source.panels.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })));
    for (const id of ['music', 'weather']) {
      const panel = layout.panels.find(p => p.id === id);
      if (!options[id]) { assert.equal(panel.items.length, 0); assert.ok(panel.codeLines.length); assert.equal(panel.icons.length, 0); }
    }
    assert.equal(!!layout.panels.find(p => p.id === 'code-right').items?.length, enabled);
    for (const id of ['pet', 'clock', 'date', 'header', 'sun']) assert.deepEqual(layout.panels.find(p => p.id === id), source.panels.find(p => p.id === id));
  }
});
test('stock configuration uses the selected symbols and target device only', () => {
  const options = { music: true, weather: true, stocks: { enabled: true, symbols: ['MSFT', 'AAPL'] } };
  const [app] = stockApp(options, 123);
  assert.match(app.UrlInfo, /symbols=MSFT,AAPL&DeviceId=123$/);
  assert.match(app.Config, /SelectSwitchID3=0/);
  assert.match(app.Config, /IEXStockSearchID1=MSFT/);
  assert.deepEqual(stockApp({ stocks: { enabled: false } }), []);
});
test('reject empty enabled lists, malformed symbols, duplicate lists and non-booleans', () => {
  for (const symbols of [[], ['aapl'], ['AAPL', 'AAPL'], ['AAPL&DeviceId=2']]) assert.throws(() => validateOptions({ music: true, weather: true, stocks: { enabled: true, symbols } }));
  assert.throws(() => validateOptions({ music: 'off', weather: true, stocks: { enabled: false, symbols: [] } }));
});
