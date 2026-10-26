import { expect, it } from 'vitest';
import { learningOwnerMismatch } from './learningOwnerHttp';
import { deriveAccountKey } from '../lib/accountKey';
it('blocks a cookie switch before account data can enter the prior owner cache', async () => {
  const identity = { userId: 'learner-a', email: 'a@example.test' };
  const owner = await deriveAccountKey(identity.userId);
  const request = new Request('https://hanzi.example/api/learning/analytics', { headers: { 'x-learning-owner': owner } });
  expect(await learningOwnerMismatch(request, identity)).toBeNull();
  expect((await learningOwnerMismatch(request, { userId: 'learner-b', email: 'b@example.test' }))?.status).toBe(409);
  expect((await learningOwnerMismatch(request, null))?.status).toBe(401);
  expect(await learningOwnerMismatch(new Request('https://hanzi.example', { headers: { 'x-learning-owner': 'anonymous:device' } }), null)).toBeNull();
});
