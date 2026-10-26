import { readActiveOwnerLearningScope, readLessonResume, writeLessonResume } from './indexedDb';
export const OFFLINE_PREPARATION_CHANGED = 'hanzi-offline-preparation-changed';
export type OfflinePreparationStatus = { version: 1; phase: 'preparing' | 'ready' | 'partial'; savedPackages: number; updatedAt: number };
const KEY = 'offline-preparation:v1';
export async function readOfflinePreparationStatus(ownerKey: string) {
  const scope = await readActiveOwnerLearningScope();
  if (!scope || scope.ownerGeneration.ownerKey !== ownerKey) return null;
  return (await readLessonResume<OfflinePreparationStatus>({ expectedOwnerGeneration: scope.ownerGeneration,
    resetEpoch: scope.resetEpoch, entryKey: KEY }))?.value ?? null;
}
export async function saveOfflinePreparationStatus(ownerKey: string, status: Omit<OfflinePreparationStatus, 'version' | 'updatedAt'>) {
  const scope = await readActiveOwnerLearningScope();
  if (!scope || scope.ownerGeneration.ownerKey !== ownerKey) return;
  await writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch,
    entryKey: KEY, value: { ...status, version: 1, updatedAt: Date.now() } satisfies OfflinePreparationStatus });
  window.dispatchEvent(new Event(OFFLINE_PREPARATION_CHANGED));
}
