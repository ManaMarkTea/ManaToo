import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const tools = JSON.parse(readFileSync(new URL('../config/toolchain.json', import.meta.url), 'utf8'));
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && command === 'npm' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.status}`);
}
for (const tool of tools) {
  const directory = fileURLToPath(new URL(`../${tool.directory}/`, import.meta.url));
  if (!existsSync(directory)) {
    run('git', ['clone', tool.repository, tool.directory]);
    run('git', ['checkout', '--detach', tool.commit], directory);
  } else {
    const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' });
    if (revision.stdout?.trim() !== tool.commit) throw new Error(`Unexpected revision in ${tool.directory}; preserve local work before changing versions.`);
  }
  run('npm', ['ci'], directory);
  run('npm', ['audit', 'fix'], directory);
  run('npm', ['run', 'build'], directory);
}
