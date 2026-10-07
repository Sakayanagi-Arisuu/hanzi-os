import { useEffect, useState } from "react";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { useLocalPagePractice } from "./useLocalPagePractice";
import { parseLessonReadingSession } from "./lessonReadingSession";
import { ANALYTICS_SKILLS } from "./analyticsActivity";
import { coveredQuestionCount, practiceQuestionKey, practicePercent, type PracticeCatalog } from "./practicePercent";

export function usePracticeCoverage(open: boolean) {
  const { state, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const authenticated = sync.session?.authenticated === true;
  const scope = `${sync.ownerKey}:${normalized.resetEpoch}:${authenticated}`;
  const evidenceRevision = state.evidence.map(item => item.activityId).sort().join("\n");
  const pages = useLocalPagePractice(sync.ownerKey, open && !authenticated, state.evidence);
  const [result, setResult] = useState<{ scope: string; catalog: PracticeCatalog; observed: string[] } | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void fetch("/api/learning/practice-coverage", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]) }).then(async response => {
      if (!response.ok) throw new Error("Coverage unavailable");
      const data = await response.json();
      if (data.authenticated !== authenticated || (authenticated && normalized.resetEpoch !== null && data.resetEpoch !== normalized.resetEpoch)
        || !data.catalog || !ANALYTICS_SKILLS.every(skill => Array.isArray(data.catalog[skill]) && data.catalog[skill].every((id: unknown) => typeof id === "string"))
        || !Array.isArray(data.observed) || !data.observed.every((id: unknown) => typeof id === "string")) throw new Error("Invalid coverage");
      if (!controller.signal.aborted) setResult({ scope, catalog: data.catalog, observed: data.observed });
    }).catch(() => { if (!controller.signal.aborted) setResult(null); });
    return () => controller.abort();
  }, [open, scope, authenticated, normalized.resetEpoch, normalized.projection?.cursor, evidenceRevision]);
  const observed = state.evidence.filter(item => item.method !== "lesson-completion"
    && (!authenticated || item.method === "speech-transcript" || item.method === "stroke-quiz")).map(item => item.activityId);
  if (!authenticated) for (const value of pages) {
    const lessonId = (value as { lessonId?: unknown } | null)?.lessonId;
    if (typeof lessonId !== "string") continue;
    const session = parseLessonReadingSession(value, lessonId);
    if (!session) continue;
    for (const page of session.document.pages) for (const block of page.blocks) {
      if (block.kind === "activity" && session.drafts[block.id]?.firstAttempt) observed.push(`lesson-page:${JSON.stringify([lessonId, page.id, block.id])}`);
    }
  }
  const current = result?.scope === scope ? result : null;
  const allObserved = [...observed, ...(current?.observed ?? [])];
  return Object.fromEntries(ANALYTICS_SKILLS.map(skill => {
    const catalog = current?.catalog[skill];
    const total = catalog ? new Set(catalog.map(practiceQuestionKey)).size : null;
    const covered = catalog ? coveredQuestionCount(catalog, allObserved) : null;
    return [skill, { total, covered, percent: practicePercent(covered, total) }];
  })) as Record<typeof ANALYTICS_SKILLS[number], { total: number | null; covered: number | null; percent: number | null }>;
}
