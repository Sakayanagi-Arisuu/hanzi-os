import { useEffect, useState } from "react";
import type { ReleasedCharacterPracticeEntry } from "../learning/richLessonContent";

type Result = { owner: string; entries: ReleasedCharacterPracticeEntry[] };
const EMPTY: ReleasedCharacterPracticeEntry[] = [];

export function usePremiumCharacters(owner: string) {
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    fetch("/api/content/premium-characters", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Premium character inventory unavailable");
        const body = await response.json() as { schemaVersion?: number; entries?: ReleasedCharacterPracticeEntry[] };
        if (body.schemaVersion !== 1 || !Array.isArray(body.entries)
          || body.entries.some(entry => entry.level !== "hsk4")) throw new Error("Premium character inventory invalid");
        if (!controller.signal.aborted) setResult({ owner, entries: body.entries });
      }).catch(() => { if (!controller.signal.aborted) setResult(null); });
    return () => controller.abort();
  }, [owner]);
  return result?.owner === owner ? result.entries : EMPTY;
}
