import type { Skill } from "../types";
export type PracticeCatalog = Record<Skill, string[]>;
/** Coverage over actual released questions, never a fixed goal or mastery. */
export function practicePercent(count: number | null, total: number | null): number | null {
  if (count === null || total === null || !Number.isSafeInteger(count)
    || !Number.isSafeInteger(total) || count < 0 || total <= 0 || count > total) return null;
  return count / total * 100;
}
export function practiceQuestionKey(id: string): string {
  return id.replace(/^diagnostic:/, "assessment:")
    .replace(/^hsk[1-4]-level-check:/, "assessment:")
    .replace(/^character-forge:[^:]+:/, "character-forge:")
    .replace(/~lexical-2026\.10\.5$/, "").replace(/:lexical-editorial-2026\.10\.5$/, "");
}
export function coveredQuestionCount(catalog: readonly string[], observed: readonly string[]): number {
  const available = new Set(catalog.map(practiceQuestionKey));
  return new Set(observed.map(practiceQuestionKey).filter(id => available.has(id))).size;
}
export function formatPracticePercent(percent: number | null): string {
  if (percent === null) return "—";
  if (percent > 0 && percent < 0.1) return "<0,1%";
  return `${Math.min(percent < 100 ? 99.9 : 100, Math.round(percent * 10) / 10).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}
