// Reuses the built app with the running local API and its existing D1 data.
process.env.E2E_PORT ??= '4174';
process.env.HANZI_OFFLINE_LOCAL_API_ORIGIN ??= 'http://localhost:3000';
process.env.NEXT_PUBLIC_SITE_URL ??= 'http://localhost:3000';
await import('./serve-production-e2e.mjs');
