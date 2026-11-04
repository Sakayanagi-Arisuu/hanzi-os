import { expect, it } from 'vitest';
import { POST } from '../../app/api/learning/adaptive-plan/route';
import { GET } from '../../app/api/learning/adaptive-unit/route';

it.each([POST, GET])('rejects old pilot requests without running planning or reading learner data', async handler => {
  const response = handler();
  expect(response.status).toBe(410);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'FEATURE_RETIRED' });
});
