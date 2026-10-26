import { readdir, readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const root = process.cwd();
const target = resolve(root, 'tmp/capacitor-public');
if (!target.startsWith(resolve(root, 'tmp') + '\\') && !target.startsWith(resolve(root, 'tmp') + '/')) throw new Error('Invalid build directory');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
const files = (await readdir('public', { recursive: true, withFileTypes: true })).filter(entry => entry.isFile());
const imageMap = {};
const derived = [];
const resources = [];
for (const entry of files) {
  const source = resolve(entry.parentPath, entry.name);
  const path = source.slice(resolve('public').length + 1).replaceAll('\\', '/');
  if (/^downloads\//.test(path) || path.startsWith('images/backoffice/')
    || ['sw.js', 'offline.html'].includes(path)) continue;
  if (/^(lessons|reader)\/.*\.(png|jpe?g|webp|avif)$/i.test(path)) {
    resources.push('/' + path.split('/').map(encodeURIComponent).join('/'));
    continue;
  }
  const destination = resolve(target, path);
  await mkdir(dirname(destination), { recursive: true });
  if (/\.(png|jpe?g|webp|avif)$/i.test(path) && !path.startsWith('icons/')) {
    const original = await readFile(source);
    const bytes = await sharp(original).resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    await writeFile(destination, bytes);
    imageMap['/' + path] = 'image/webp';
    derived.push({ source: 'public/' + path, sourceSha256: createHash('sha256').update(original).digest('hex'),
      derivedSha256: createHash('sha256').update(bytes).digest('hex') });
  } else await copyFile(source, destination);
  if (/^(hanzi-data|content)\/.*\.json$/.test(path) || /^assets\/.*\.(mp3|ogg|wav|m4a)$/.test(path)) resources.push('/' + path.split('/').map(encodeURIComponent).join('/'));
}
await writeFile(resolve(target, 'native-image-map.json'), JSON.stringify(imageMap));
await writeFile(resolve(target, 'offline-assets.json'), JSON.stringify({ version: 1, assets: [], resources }));
await writeFile(resolve(root, 'tmp/capacitor-image-provenance.json'), JSON.stringify({ recipe: 'sharp webp quality72 inside1280', images: derived }, null, 2));
const vite = spawnSync(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'build', '--config', 'mobile/vite.config.ts'],
  { stdio: 'inherit', windowsHide: true });
if (vite.status !== 0) throw new Error('Packaged UI build failed');
const rich = JSON.parse(await readFile('content/runtime/hsk4-level-rich-lessons.json', 'utf8'));
const markers = rich.lessons.flatMap(lesson => [lesson.topics?.[0]?.id, lesson.grammar?.[0]?.id, lesson.tasks?.[0]?.id]).filter(Boolean);
for (const name of await readdir('tmp/capacitor-web/assets')) {
  if (extname(name) !== '.js') continue;
  const code = await readFile(resolve('tmp/capacitor-web/assets', name), 'utf8');
  if (markers.some(marker => code.includes(marker))) throw new Error('Premium learning payload in native public bundle');
}
console.log(`Packaged UI ready; ${resources.length} local reference resources, ${derived.length} derived images; Premium bundle boundary passed.`);
