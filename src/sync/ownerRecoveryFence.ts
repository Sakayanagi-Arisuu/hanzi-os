export const ACTIVE_OWNER_RECOVERY_KEY = 'activeOwnerRecovery:v1';
export const ACTIVE_OWNER_RECOVERY_PREVIEW_KEY = 'activeOwnerRecoveryPreview:v1';
export const OWNER_RECOVERY_CHANGED = 'hanzi-owner-recovery-changed';
export const recoveryJobKey = (id: string) => `owner-recovery-job:v1:${id}`;
export type OwnerRecoveryFence = { version: 1; ownerKey: string; generation: number; jobId: string };
export class OwnerRecoveryInProgressError extends Error {
  constructor() { super('Owner recovery is pending; retain current data and finish or roll back recovery.'); }
}
export async function assertOwnerRecoveryIdle(store: IDBObjectStore, allowPreviewRead = false) {
  const flag = await new Promise<unknown>((resolve, reject) => {
    const request = store.get(ACTIVE_OWNER_RECOVERY_KEY);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  if (flag !== undefined) throw new OwnerRecoveryInProgressError();
  // Preview freezes writers while permitting the recovery reader to capture a
  // stable preimage. No learner provider should mount during this durable pause.
  if (!allowPreviewRead || store.transaction.mode === 'readwrite') {
    const preview = await new Promise<unknown>((resolve, reject) => {
      const request = store.get(ACTIVE_OWNER_RECOVERY_PREVIEW_KEY);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    if (preview !== undefined) throw new OwnerRecoveryInProgressError();
  }
}
export function announceOwnerRecovery() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OWNER_RECOVERY_CHANGED));
  if (typeof BroadcastChannel !== 'undefined') {
    try { const channel = new BroadcastChannel(OWNER_RECOVERY_CHANGED); channel.postMessage('changed'); channel.close(); } catch { /* Focus/bootstrap checks remain. */ }
  }
}
