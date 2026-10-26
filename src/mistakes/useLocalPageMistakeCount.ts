import { useEffect, useState } from 'react';
import { listLessonResumes } from '../sync/indexedDb';
import { resolveLearningResumeOwnerScope } from '../sync/learningResumeStore';
import { collectLocalPageMistakes } from './localPageMistakes';

export function useLocalPageMistakeCount(ownerKey: string, enabled = true) {
  const [result, setResult] = useState<{ ownerKey: string; count: number } | null>(null);
  useEffect(() => {
    if (!ownerKey || !enabled) return;
    let active = true, generation = 0;
    const refresh = () => {
      const ticket = ++generation;
      void (async () => {
        const scope = await resolveLearningResumeOwnerScope(ownerKey);
        const items = await collectLocalPageMistakes(await listLessonResumes(scope));
        if (active && ticket === generation) setResult({ ownerKey, count: items.filter(entry => !entry.item.resolved).length });
      })().catch(() => { if (active && ticket === generation) setResult(null); });
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('hanzi-reading-saved', refresh);
    window.addEventListener('hanzi-page-corrections-updated', refresh);
    window.addEventListener('hanzi-learning-reset', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh);
      window.removeEventListener('hanzi-reading-saved', refresh); window.removeEventListener('hanzi-page-corrections-updated', refresh);
      window.removeEventListener('hanzi-learning-reset', refresh); };
  }, [ownerKey, enabled]);
  return result?.ownerKey === ownerKey ? result.count : null;
}
