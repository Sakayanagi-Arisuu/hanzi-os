import { readdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = await readdir('dist/client/assets');
const assets = files.filter(name => /\.(js|css|woff2?)$/.test(name)).sort().map(name => `/assets/${name}`);
if (!assets.length) throw new Error('Offline build has no application assets');
const publicFiles = await readdir('public', { recursive: true });
const resources = publicFiles.map(path => path.replaceAll('\\', '/'))
  .filter(path => /^(hanzi-data|content)\/.*\.json$/.test(path) || /^assets\/.*\.(mp3|ogg|wav|m4a)$/.test(path))
  .sort().map(path => '/' + path.split('/').map(encodeURIComponent).join('/'));
await writeFile('dist/client/offline-assets.json', JSON.stringify({ version: 1, assets, resources }));
const revision = createHash('sha256').update(JSON.stringify(assets)).update(await readFile('dist/client/sw.js')).digest('hex').slice(0, 16);
const worker = await readFile('dist/client/sw.js', 'utf8');
if (!/const CACHE_VERSION = "v\d+";/.test(worker)) throw new Error('Offline worker version marker missing');
await writeFile('dist/client/sw.js', worker.replace(/const CACHE_VERSION = "(v\d+)";/, `const CACHE_VERSION = "$1-${revision}";`));
console.log(`Offline shell: ${assets.length} versioned code/font assets.`);
