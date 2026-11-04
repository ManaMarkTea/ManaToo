import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function validateOptions(options) {
  for (const key of ['music', 'weather']) if (typeof options[key] !== 'boolean') throw new Error(`${key} must be true or false.`);
  if (typeof options.stocks?.enabled !== 'boolean' || !Array.isArray(options.stocks.symbols)) throw new Error('stocks needs enabled and symbols.');
  const symbols = options.stocks.symbols;
  if (symbols.length > 10 || symbols.some(s => typeof s !== 'string' || !/^[A-Z0-9.^-]{1,16}$/.test(s)) || new Set(symbols).size !== symbols.length) throw new Error('Use up to 10 unique uppercase stock symbols.');
  if (options.stocks.enabled && !symbols.length) throw new Error('Choose stock symbols before enabling stocks.');
  return options;
}

export function resolveLayout(source, options) {
  validateOptions(options);
  const layout = structuredClone(source);
  const code = layout.panels.find(p => p.id === 'code-right');
  for (const id of ['music', 'weather']) {
    if (options[id]) continue;
    const panel = layout.panels.find(p => p.id === id);
    panel.title = `> decor/${id === 'music' ? 'Audio' : 'Weather'}.js`;
    panel.items = []; panel.icons = []; panel.labels = [];
    panel.codeLines = structuredClone(code.codeLines).map((line, i) => ({ ...line, y: 30 + i * (panel.h < 100 ? 12 : 17), spans: line.spans.map(span => ({ ...span })) }));
    if (panel.w < 180) panel.codeLines = panel.codeLines.slice(1).map((line, i) => ({ ...line, y: 35 + i * 20 }));
  }
  if (options.stocks.enabled) {
    code.title = '> stocks/02 ~/Market'; code.codeLines = []; code.labels = [];
    const base = { font: 138, size: 14, alig: 4, sep: 0, angle: 0, hier: 2, transp: 100, animation: 0, image_id: 0, image_addr: '', color_1: '#79CCD9', color_2: '#030609' };
    // Same rotating app-data fields as Divoom's bundled U.S. Stocks face (162).
    code.items = [
      { ...base, item_id: 'stock-name', disp: 35, x: 9, y: 29, w: 170, h: 24 },
      { ...base, item_id: 'stock-price', disp: 16, x: 9, y: 55, w: 170, h: 26, size: 20, color_1: '#6BE891' },
      { ...base, item_id: 'stock-change', disp: 38, x: 9, y: 85, w: 170, h: 23 }
    ];
  }
  return layout;
}

export function stockApp(options, deviceId) {
  if (!options.stocks.enabled) return [];
  if (deviceId !== undefined && (!Number.isInteger(deviceId) || deviceId <= 0)) throw new Error('Invalid target device identity.');
  const symbols = options.stocks.symbols;
  const config = ['text='];
  for (let i = 0; i < 10; i++) {
    config.push(`SelectSwitchID${i + 1}=${i < symbols.length ? 1 : 0}`, `IEXStockSearchID${i + 1}=${encodeURIComponent(symbols[i] ?? '')}`, `DivoomDispSearchName=${encodeURIComponent(symbols[i] ?? '')}`);
  }
  return [{ UpdateTime: 60, AppID: 614, DivoomAppType: 23, UrlHead: [], UrlInfo: `http://api.divoom-gz.com/DivoomChinaStock/GetIEXStockInfoV2?symbols=${symbols.join(',')}${deviceId === undefined ? '' : '&DeviceId=' + deviceId}`, Config: '&' + config.join('&'), AppName: '', AppTitle: symbols.map(s => s + ',').join(''), DispData: ['quote,f:latestPrice', 'quote,p:changePercent'] }];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const configFile = new URL('../config/face.json', import.meta.url);
  const options = JSON.parse(await readFile(configFile, 'utf8'));
  const [key, value] = process.argv.slice(2);
  if (key) {
    if (['music', 'weather', 'stocks'].includes(key)) {
      if (!['on', 'off'].includes(value)) throw new Error('Use on or off.');
      if (key === 'stocks') options.stocks.enabled = value === 'on'; else options[key] = value === 'on';
    } else if (key === 'symbols') options.stocks.symbols = (value ?? '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    else throw new Error('Use music, weather, stocks, or symbols.');
    validateOptions(options);
    await writeFile(configFile, JSON.stringify(options, null, 2) + '\n');
  }
  console.log(JSON.stringify(options, null, 2));
  console.log('Apply with npm run face:draw, then npm run face:deploy.');
}
