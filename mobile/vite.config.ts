import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const hosted = JSON.parse(readFileSync('config/cloudflare-release.local.json', 'utf8'));
const registry = JSON.parse(readFileSync('content/registry.json', 'utf8'));
const current = registry.packages.find((entry: { contentVersion: string }) => entry.contentVersion === registry.currentContentVersion);
const release = JSON.parse(readFileSync('mobile/release-config.json', 'utf8'));
if (hosted.studyMode !== 'personal-study' && hosted.personalStudy !== true) {
  // The release config uses studyMode; never infer a production promotion.
  if (hosted.hanziStudyMode !== 'personal-study') throw new Error('Packaged study requires the authorized personal-study release config');
}

export default defineConfig({
  root: resolve('mobile'), publicDir: resolve('tmp/capacitor-public'), plugins: [react()],
  resolve: { alias: { 'next/link': resolve('mobile/NextLink.tsx') } },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __HANZI_LOCAL_OFFLINE_PREVIEW__: 'false', __HANZI_HOSTED_STUDY__: 'null',
    __HANZI_PACKAGED_STUDY__: JSON.stringify({ manifestSha256: current.manifestSha256 }),
    __HANZI_NATIVE_VERSION__: JSON.stringify({ code: release.versionCode, name: release.versionName, origin: release.origin }),
  },
  build: { outDir: resolve('tmp/capacitor-web'), emptyOutDir: true, target: 'es2022' },
});
