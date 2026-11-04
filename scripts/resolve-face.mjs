import { readFile, writeFile } from 'node:fs/promises';
import { resolveLayout } from './face-options.mjs';
const face = new URL('../faces/code-clock/', import.meta.url);
const source = JSON.parse(await readFile(new URL('layout.json', face), 'utf8'));
const options = JSON.parse(await readFile(new URL('../config/face.json', import.meta.url), 'utf8'));
await writeFile(new URL('resolved-layout.json', face), JSON.stringify(resolveLayout(source, options), null, 2) + '\n');
