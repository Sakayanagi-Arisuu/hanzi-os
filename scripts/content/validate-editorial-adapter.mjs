import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const hash = (text) => 'sha256:' + createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

export function validateEditorialAdapter(read = (path) => readFileSync(path, 'utf8')) {
  const binding = JSON.parse(read('content/runtime/lexical-editorial-adapter.json'));
  const registry = JSON.parse(read('content/registry.json'));
  if (binding.schemaVersion !== 1 || binding.humanReviewed !== false
    || binding.baseContentVersion !== registry.currentContentVersion
    || binding.derivativeVersion !== 'lexical-editorial-2026.10.5') {
    throw new Error('Invalid editorial adapter foundation/review binding');
  }
  const required = [
    'content/packages/foundation-2026.08.7/manifest.json',
    'content/packages/lexical-editorial-2026.10.5/manifest.json',
    'content/packages/lexical-editorial-2026.10.5/word-catalog.json',
    'src/content/lexicalEditorialCatalog.ts',
    'src/lib/editorialExerciseGeneration.ts',
    'src/server/editorialItemBank.ts',
    'src/server/editorialAttemptScoring.ts',
  ];
  if (Object.keys(binding.artifacts).length !== required.length) throw new Error('Incomplete editorial adapter inventory');
  for (const path of required) {
    if (binding.artifacts[path] !== hash(read(path))) throw new Error(`Editorial adapter digest mismatch: ${path}`);
  }
  return { valid: true, adapter: binding.derivativeVersion, humanReviewed: false };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log(JSON.stringify(validateEditorialAdapter()));
}
