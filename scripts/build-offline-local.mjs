import { spawn } from 'node:child_process';

if (!process.env.npm_execpath) throw new Error('Run npm run build:offline-local');
const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
  stdio: 'inherit', env: { ...process.env, HANZI_LOCAL_OFFLINE_PREVIEW: '1' },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
