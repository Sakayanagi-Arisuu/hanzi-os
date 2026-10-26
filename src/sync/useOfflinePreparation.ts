import { useEffect } from 'react';
import { offlineRead } from './offlineRead';
import { prepareOfflineStudy } from '../lib/prepareOfflineStudy';
import { fetchReviewQueue } from './reviewQueueClient';
import { readActiveOwnerLearningScope } from './indexedDb';
import { saveOfflinePreparationStatus } from './offlinePreparationStatus';
import type { CatalogEntry } from '../screens/MockExamsPage';
import type { ReaderSeries } from '../reader/library/readerContentModel';

/** Warm shared learner content automatically after identity resolution. */
export function useOfflinePreparation(ownerKey: string | null) {
  useEffect(() => {
    if (!ownerKey) return;
    const controller = new AbortController();
    let running = false;
    let retryTimer: number | undefined;
    let retryCount = 0;
    const prepare = async () => {
      if (running || !navigator.onLine || controller.signal.aborted) return;
      running = true;
      try {
        const scope = await readActiveOwnerLearningScope();
        if (!scope || scope.ownerGeneration.ownerKey !== ownerKey) return;
        const payloads: unknown[] = [];
        let failed = false;
        let savedPackages = 0;
        await saveOfflinePreparationStatus(ownerKey, { phase: 'preparing', savedPackages });
        const read = async (url: string) => {
          const response = await offlineRead(url, { signal: controller.signal, offlineTimeoutMs: 60_000 });
          if (!response.ok || response.headers.has('x-hanzi-offline')) throw new Error('Preparation server unavailable');
          const value: unknown = await response.json();
          payloads.push(value); savedPackages++;
          return value;
        };
        const paths = ['learning', 'vocabulary', 'character', 'pronunciation'].map(projection => `/api/content/runtime?projection=${projection}`);
        if (ownerKey.startsWith('siwc_')) paths.push('/api/learning/mistakes', '/api/learning/analytics', '/api/learning/practice-coverage', '/api/exams/history');
        for (const path of paths) {
          if (controller.signal.aborted) return;
          try { await read(path); } catch { failed = true; }
        }
        if (ownerKey.startsWith('siwc_')) {
          try { await fetchReviewQueue({ expectedOwnerGeneration: scope.ownerGeneration,
            expectedResetEpoch: scope.resetEpoch, signal: controller.signal }); } catch { failed = true; }
          try {
            const catalog = await read('/api/exams/catalog') as { forms: CatalogEntry[]; accessAvailable?: boolean };
            if (catalog.accessAvailable === false) failed = true;
            for (const form of catalog.forms.filter(form => !form.locked)) {
              if (controller.signal.aborted) return;
              try { await read(`/api/exams/${form.examLevel}/${form.formKey}/practice`); } catch { failed = true; }
            }
          } catch { failed = true; }
        }
        try {
          const inventory = await read('/api/content/offline-inventory') as { premiumLessonIds: string[] };
          for (const id of inventory.premiumLessonIds) {
            if (controller.signal.aborted) return;
            try { await read(`/api/content/premium-rich?lessonId=${encodeURIComponent(id)}`); } catch { failed = true; }
          }
          if (inventory.premiumLessonIds.length) await read('/api/content/premium-level-check');
        } catch { failed = true; }
        try {
          const catalog = await read('/api/reader/editorial/catalog') as { series: ReaderSeries[] };
          for (const series of catalog.series) for (const volume of series.volumes) for (const chapter of volume.chapters) {
            if (controller.signal.aborted) return;
            try { await read(`/api/reader/editorial/chapters/${encodeURIComponent(series.seriesId)}/${encodeURIComponent(chapter.chapterId)}`); } catch { failed = true; }
          }
        } catch { failed = true; }
        if (process.env.NODE_ENV !== 'development') {
          try {
            const response = await fetch('/offline-assets.json', { signal: controller.signal });
            if (!response.ok) throw new Error('Offline inventory unavailable');
            const manifest = await response.json() as { resources?: string[] };
            if (!Array.isArray(manifest.resources)) throw new Error('Offline resource inventory missing');
            payloads.push(manifest.resources);
            await prepareOfflineStudy(payloads);
          } catch { failed = true; }
        } else failed = true;
        const current = await readActiveOwnerLearningScope();
        if (!controller.signal.aborted && current?.ownerGeneration.generation === scope.ownerGeneration.generation
          && current.resetEpoch === scope.resetEpoch) await saveOfflinePreparationStatus(ownerKey, { phase: failed ? 'partial' : 'ready', savedPackages });
        if (failed && !controller.signal.aborted) {
          retryTimer = window.setTimeout(() => { void prepare(); }, Math.min(300_000, 30_000 * 2 ** retryCount++));
        } else retryCount = 0;
      } catch {
        if (!controller.signal.aborted) {
          await saveOfflinePreparationStatus(ownerKey, { phase: 'partial', savedPackages: 0 }).catch(() => undefined);
          retryTimer = window.setTimeout(() => { void prepare(); }, Math.min(300_000, 30_000 * 2 ** retryCount++));
        }
      }
      finally { running = false; }
    };
    const wake = () => { void prepare(); };
    wake();
    const timer = window.setInterval(wake, 300_000);
    window.addEventListener('online', wake);
    window.addEventListener('hanzi-prepare-offline', wake);
    return () => { controller.abort(); window.clearInterval(timer); window.clearTimeout(retryTimer); window.removeEventListener('online', wake); window.removeEventListener('hanzi-prepare-offline', wake); };
  }, [ownerKey]);
}
