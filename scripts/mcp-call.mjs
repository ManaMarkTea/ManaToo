import { Client } from '../tools/mcp-divoom-lan/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../tools/mcp-divoom-lan/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(new URL('../config/device.local.json', import.meta.url), 'utf8'));
const client = new Client({ name: 'manatoo', version: '0.1.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [root + 'tools/mcp-divoom-lan/dist/index.js'] }));
try {
  const [name, argsFile, output] = process.argv.slice(2);
  const args = argsFile ? JSON.parse(await readFile(argsFile, 'utf8')) : {};
  const result = await client.callTool({ name, arguments: { ...args, target: { ...config, model: 'auto' } } });
  if (output) await writeFile(output, JSON.stringify(result, null, 2));
  for (const block of result.content ?? []) if (block.type === 'text') console.log(block.text);
  if (result.isError) process.exitCode = 1;
} finally { await client.close(); }
