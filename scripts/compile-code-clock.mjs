import { readFile, writeFile } from 'node:fs/promises';
const face = new URL('../faces/code-clock/', import.meta.url);
const layout = JSON.parse(await readFile(new URL('layout.json', face), 'utf8'));
const imageSlots = [13, 125, 126, 127, 128, 129, 130, 173];
if (layout.panels.length > imageSlots.length) throw new Error('Too many panel image slots.');
const base = { size: 0, font: 138, alig: 4, sep: 0, angle: 0, hier: 0, transp: 100, animation: 0, image_id: 0, image_addr: '', color_1: '#FFFFFF', color_2: '#030609' };
const items = [];
for (const [index, panel] of layout.panels.entries()) {
  items.push({ ...base, item_id: `panel-${panel.id}`, disp: imageSlots[index], x: panel.x, y: panel.y, w: panel.w, h: panel.h, image_addr: `asset:panel-${panel.id}.png` });
  for (const item of panel.items ?? []) items.push({ ...item, x: panel.x + item.x, y: panel.y + item.y, hier: 2 });
}
const metadata = { ClockName: layout.name, NameEn: layout.name, NameCn: layout.name, DialAssets: 'image', ItemList: items, ItemIdList: items.map(item => item.item_id) };
await writeFile(new URL('metadata.json', face), JSON.stringify(metadata, null, 2) + '\n');
