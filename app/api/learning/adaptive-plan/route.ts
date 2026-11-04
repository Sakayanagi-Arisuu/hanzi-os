// Compatibility response for old tabs after retiring goal-based practice.
export function POST() {
  return Response.json({ error: 'FEATURE_RETIRED' }, {
    status: 410, headers: { 'Cache-Control': 'no-store' },
  });
}
