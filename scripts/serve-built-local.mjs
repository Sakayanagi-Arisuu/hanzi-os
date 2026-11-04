// Compiled local worker: same origin, existing D1, no remote deployment.
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--port' || !/^\d+$/.test(args[1]))) throw new Error('Usage: npm run dev:stable -- [--port 3000]');
const port = Number(args[1] ?? 3000);
if (port < 1024 || port > 65535) throw new Error('Local port must be between 1024 and 65535.');
let marker;
try { marker = JSON.parse(await readFile(resolve(root, 'dist/local-preview.json'), 'utf8')); }
catch { throw new Error('Run npm run build:offline-local before npm run dev:stable.'); }
if (marker.localPreview !== true) throw new Error('The build is not a local preview. Run npm run build:offline-local.');
const config = JSON.parse(await readFile(resolve(root, 'dist/server/wrangler.json'), 'utf8'));
config.main = './dist/server/index.js';
config.assets.directory = './dist/client';
config.vars = { ...config.vars, AUTH_DEV_HANZI_DEMOS: '1' };
config.d1_databases.forEach(binding => { binding.migrations_dir = './drizzle'; });
const configPath = resolve(root, '.wrangler-runtime.local.json');
await writeFile(configPath, JSON.stringify(config, null, 2));
const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const migrate = spawn(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'DB', '--local',
  '--config', resolve(root, 'wrangler.local.jsonc'), '--persist-to', resolve(root, '.wrangler/state')], { cwd: root, stdio: 'inherit' });
const migrationCode = await new Promise((ok, fail) => { migrate.on('error', fail); migrate.on('exit', ok); });
if (migrationCode !== 0) throw new Error('Local database setup failed; server was not started.');
const child = spawn(process.execPath, [wrangler, 'dev', '--config', configPath,
  '--persist-to', resolve(root, '.wrangler/state'), '--ip', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
