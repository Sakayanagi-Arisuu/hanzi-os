export type RemediationObservatorySkill =
  | "pronunciation"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "vocabulary"
  | "grammar";

export type RemediationObservatorySource = "lesson" | "reader" | "review";

export type RemediationObservatoryItem = {
  id: string;
  skill: RemediationObservatorySkill;
  skillLabel: string;
  kindLabel: string;
  originSource: RemediationObservatorySource;
  originLabel: string;
  originDetail: string;
  instruction: string;
  prompt: string;
  promptMeta?: string | null;
  options: readonly string[];
  hint: string;
  spokenText?: string | null;
  previousAnswer?: string | null;
  occurrenceCount: number;
  correctedStreak: number;
  resolved: boolean;
  lastAttemptAt: number;
};

export type RemediationObservatoryFeedback = {
  outcome: "correct" | "incorrect";
  resolved: boolean;
  answer: string;
  correctAnswer?: string | null;
  explanation: string;
  usedHint: boolean;
};

export type RemediationObservatoryResult = RemediationObservatoryFeedback & {
  itemId: string;
  skill: RemediationObservatorySkill;
  skillLabel: string;
};

export type RemediationSkillSignal = {
  skill: RemediationObservatorySkill;
  label: string;
  count: number;
};

export type RemediationSourceSignal = {
  source: RemediationObservatorySource;
  label: string;
  count: number;
};

const skillOrder: readonly RemediationObservatorySkill[] = [
  "listening",
  "pronunciation",
  "grammar",
  "vocabulary",
  "reading",
  "speaking",
  "writing",
];

export function selectRemediationSession(
  items: readonly RemediationObservatoryItem[],
  limit = 5,
) {
  return items.filter((item) => !item.resolved).slice(0, Math.max(0, limit));
}

export function countActiveSignals(items: readonly RemediationObservatoryItem[]) {
  return items
    .filter((item) => !item.resolved)
    .reduce((total, item) => total + Math.max(1, item.occurrenceCount), 0);
}

export function buildSkillSignals(
  items: readonly RemediationObservatoryItem[],
): RemediationSkillSignal[] {
  const active = items.filter((item) => !item.resolved);
  return skillOrder.flatMap((skill) => {
    const matching = active.filter((item) => item.skill === skill);
    if (matching.length === 0) return [];
    return [{
      skill,
      label: matching[0]!.skillLabel,
      count: matching.reduce(
        (total, item) => total + Math.max(1, item.occurrenceCount),
        0,
      ),
    }];
  });
}

export function buildSourceSignals(
  items: readonly RemediationObservatoryItem[],
): RemediationSourceSignal[] {
  const active = items.filter((item) => !item.resolved);
  const order: readonly RemediationObservatorySource[] = [
    "lesson",
    "reader",
    "review",
  ];
  return order.flatMap((source) => {
    const matching = active.filter((item) => item.originSource === source);
    if (matching.length === 0) return [];
    return [{
      source,
      label: matching[0]!.originLabel,
      count: matching.reduce(
        (total, item) => total + Math.max(1, item.occurrenceCount),
        0,
      ),
    }];
  });
}

export function buildSevenDaySignals(
  items: readonly RemediationObservatoryItem[],
  now = Date.now(),
) {
  const oneDay = 86_400_000;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const start = startOfToday.getTime();
  const counts = Array.from({ length: 7 }, () => 0);

  for (const item of items) {
    if (item.resolved || !Number.isFinite(item.lastAttemptAt)) continue;
    const itemDay = new Date(item.lastAttemptAt);
    itemDay.setHours(0, 0, 0, 0);
    const age = Math.round((start - itemDay.getTime()) / oneDay);
    const index = 6 - Math.max(0, age);
    if (index >= 0 && index < counts.length) counts[index] += 1;
  }

  return counts;
}

export function buildSevenDayLabels(now = Date.now()) {
  const weekdayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 6);
  return Array.from({ length: 7 }, (_, index) => {
    if (index === 6) return "Nay";
    const label = weekdayLabels[cursor.getDay()]!;
    cursor.setDate(cursor.getDate() + 1);
    return label;
  });
}

export function summarizeRemediationResults(
  results: readonly RemediationObservatoryResult[],
) {
  const skillRows = new Map<RemediationObservatorySkill, {
    label: string;
    total: number;
    resolved: number;
  }>();
  for (const result of results) {
    const row = skillRows.get(result.skill) ?? {
      label: result.skillLabel,
      total: 0,
      resolved: 0,
    };
    row.total += 1;
    if (result.resolved) row.resolved += 1;
    skillRows.set(result.skill, row);
  }
  return {
    total: results.length,
    resolved: results.filter((result) => result.resolved).length,
    unassistedCorrect: results.filter((result) =>
      result.outcome === "correct" && !result.usedHint
    ).length,
    retry: results.filter((result) => !result.resolved).length,
    skills: skillOrder.flatMap((skill) => {
      const row = skillRows.get(skill);
      return row ? [{ skill, ...row }] : [];
    }),
  };
}
