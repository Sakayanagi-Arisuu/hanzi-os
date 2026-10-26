import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const config = JSON.parse(await readFile('.deploy/wrangler.json', 'utf8'));
const registry = JSON.parse(await readFile('content/registry.json', 'utf8'));
const current = registry.packages.find(entry => entry.contentVersion === registry.currentContentVersion);
const study = config.vars?.HANZI_STUDY_MODE === 'personal-study'
  ? { origin: config.vars.NEXT_PUBLIC_SITE_URL, manifestSha256: current.manifestSha256 } : null;
if (config.vars?.HANZI_HOSTING_PROVIDER !== 'cloudflare' || !process.env.npm_execpath) throw new Error('Run hosting:prepare before build:cloudflare.');
const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
  stdio: 'inherit', env: { ...process.env, HANZI_CLOUDFLARE_CONFIG: '.deploy/wrangler.json',
    HANZI_LOCAL_OFFLINE_PREVIEW: '0', HANZI_HOSTED_STUDY_BUILD: JSON.stringify(study), NEXT_PUBLIC_SITE_URL: config.vars.NEXT_PUBLIC_SITE_URL },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
