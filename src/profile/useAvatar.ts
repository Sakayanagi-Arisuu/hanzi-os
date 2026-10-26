import { useCallback, useEffect, useState } from 'react';
import { useLearning } from '../store/LearningContext';
import { readActiveOwnerLearningScope, type OwnerGeneration } from '../sync/indexedDb';
import { AVATAR_CHANGED, readAvatar } from './avatarStorage';
import type { AvatarRecord } from './avatarContract';
import { readAccountAvatar } from './accountAvatarClient';

export function useAvatar() {
  const { sync } = useLearning();
  const ownerKey = sync.ownerKey;
  const [revision, refresh] = useState(0);
  const retry = useCallback(() => refresh(value => value + 1), []);
  const [snapshot, setSnapshot] = useState<{ owner: OwnerGeneration; record: AvatarRecord | null; uploadAvailable: boolean } | null>(null);
  const [error, setError] = useState('');
  const [image, setImage] = useState<{ ownerKey: string; url: string } | null>(null);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    void (async () => {
      const scope = await readActiveOwnerLearningScope();
      if (!scope || scope.ownerGeneration.ownerKey !== ownerKey) return;
      const account = ownerKey.startsWith('anonymous:') ? null : await readAccountAvatar(scope.ownerGeneration, { signal: abort.signal });
      const record = account ? account.record : await readAvatar(scope.ownerGeneration);
      if (active) {
        setSnapshot(previous => ({ owner: scope.ownerGeneration,
          record: previous?.owner.ownerKey === ownerKey && previous.owner.generation === scope.ownerGeneration.generation
            && previous.record?.revision === record?.revision ? previous.record : record,
          uploadAvailable: account?.snapshot.uploadAvailable ?? true }));
        setError('');
      }
    })().catch(() => { if (active) setError('Chưa đọc được ảnh đại diện; ảnh cũ vẫn được giữ.'); });
    return () => { active = false; abort.abort(); };
  }, [ownerKey, revision]);
  const blob = snapshot?.owner.ownerKey === ownerKey ? snapshot.record?.blob : null;
  useEffect(() => {
    if (!blob) { setImage(null); return; }
    const url = URL.createObjectURL(blob); setImage({ ownerKey, url });
    return () => URL.revokeObjectURL(url);
  }, [ownerKey, blob]);
  useEffect(() => {
    window.addEventListener(AVATAR_CHANGED, retry); window.addEventListener('focus', retry); window.addEventListener('hanzi-learning-reset', retry);
    let channel: BroadcastChannel | null = null;
    try { if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(AVATAR_CHANGED); }
    catch { /* Focus and local events still refresh the image. */ }
    if (channel) channel.onmessage = retry;
    return () => { window.removeEventListener(AVATAR_CHANGED, retry); window.removeEventListener('focus', retry); window.removeEventListener('hanzi-learning-reset', retry); channel?.close(); };
  }, [retry]);
  const current = snapshot?.owner.ownerKey === ownerKey ? snapshot : null;
  return { owner: current?.owner ?? null, record: current?.record ?? null, ready: Boolean(current) && !error,
    url: image?.ownerKey === ownerKey ? image.url : null, error, retry, canUpload: current?.uploadAvailable === true, authenticated: sync.session?.authenticated === true };
}
