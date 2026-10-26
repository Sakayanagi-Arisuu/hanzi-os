import { readLessonResume, updateLessonResume, readActiveOwnerLearningScope, type ActiveOwnerLearningScope } from './indexedDb';
type Claim = { kind: 'lesson'; lessonId: string; resetEpoch: number } | { rewardKey: string; resetEpoch: number };
type Journal = { version: 1; pending: Claim[] };
const KEY = 'offline-interaction-xp:v1';
export const XP_QUEUE_CHANGED = 'hanzi-xp-queue-changed';
const scopeFor = (scope: ActiveOwnerLearningScope) => ({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: KEY });
const parse = (value: unknown): Journal => {
  if (value === undefined) return { version: 1, pending: [] };
  const journal = value as Journal;
  if (journal?.version !== 1 || !Array.isArray(journal.pending)) throw new Error('XP queue unavailable');
  return journal;
};
export async function pendingInteractionXp(scope: ActiveOwnerLearningScope) {
  return parse((await readLessonResume(scopeFor(scope)))?.value).pending;
}
export async function queueInteractionXp(claim: Claim) {
  const scope = await readActiveOwnerLearningScope();
  if (!scope || scope.resetEpoch !== claim.resetEpoch || !scope.ownerGeneration.ownerKey.startsWith('siwc_')) throw new Error('XP owner changed');
  await updateLessonResume(scopeFor(scope), value => {
    const journal = parse(value);
    if (journal.pending.some(item => JSON.stringify(item) === JSON.stringify(claim))) return journal;
    return { version: 1, pending: [...journal.pending, claim] } satisfies Journal;
  });
  window.dispatchEvent(new Event(XP_QUEUE_CHANGED));
  return scope;
}
export async function flushInteractionXp(scope: ActiveOwnerLearningScope, signal: AbortSignal, send: typeof fetch = fetch) {
  const receipts = new Map<string, { awarded: boolean; amount: number }>();
  for (const claim of await pendingInteractionXp(scope)) {
    const response = await send('/api/learning/xp', { method: 'POST', signal, credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-learning-owner': scope.ownerGeneration.ownerKey }, body: JSON.stringify(claim) });
    if (!response.ok) continue;
    const receipt = await response.json() as { awarded: boolean; amount: number };
    if (typeof receipt.awarded !== 'boolean' || !Number.isSafeInteger(receipt.amount) || receipt.amount < 0) throw new Error('XP receipt invalid');
    await updateLessonResume(scopeFor(scope), value => ({ version: 1,
      pending: parse(value).pending.filter(item => JSON.stringify(item) !== JSON.stringify(claim)) } satisfies Journal));
    receipts.set(JSON.stringify(claim), receipt);
    window.dispatchEvent(new Event('hanzi-interaction-xp-changed'));
  }
  return receipts;
}
export async function claimInteractionXpDurably(claim: Claim) {
  const scope = await queueInteractionXp(claim);
  try { return (await flushInteractionXp(scope, AbortSignal.timeout(12_000))).get(JSON.stringify(claim)) ?? null; }
  catch { return null; }
}
