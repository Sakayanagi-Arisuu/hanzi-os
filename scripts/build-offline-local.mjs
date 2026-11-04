import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
if (!process.env.npm_execpath) throw new Error('Run npm run build:offline-local');
const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
  stdio: 'inherit', env: { ...process.env, HANZI_LOCAL_OFFLINE_PREVIEW: '1',
    HANZI_HOSTED_STUDY_BUILD: 'null', HANZI_CLOUDFLARE_CONFIG: '', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', async code => {
  process.exitCode = code ?? 1;
  if (code === 0) await writeFile('dist/local-preview.json', JSON.stringify({ localPreview: true }));
});
