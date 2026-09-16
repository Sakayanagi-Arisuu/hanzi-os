import { describe, expect, it } from "vitest";
import { accessDay, localAnalyticsActivity, parseAnalyticsActivity, withDevicePractice } from "./analyticsActivity";
import type { LearningEvidence } from "../types";
const evidence = (key: string, patch: Partial<LearningEvidence> = {}): LearningEvidence => ({
  id: key, idempotencyKey: key, schemaVersion: 1, contentVersion: "v1", activityVersion: "v1", source: "lesson", method: "meaning-selection", activityId: "item-1", skill: "vocabulary", outcome: "correct", score: 100, verified: false, masteryEligible: false, occurredAt: "2026-09-10T18:00:00Z", ...patch,
});
describe("descriptive analytics", () => {
  it('preserves page-practice counts when adding device practice and rejects inconsistent totals',()=>{
    const base={...localAnalyticsActivity([]),pagePractice:{attempts:3,unique:2,correct:1,incorrect:1,selfReview:1}};
    expect(parseAnalyticsActivity(base)).toEqual(base);
    expect(withDevicePractice(base,[evidence('speech',{method:'speech-transcript',source:'pronunciation',skill:'speaking'})])?.pagePractice).toEqual(base.pagePractice);
    for(const invalid of [null,{}, {...base.pagePractice,unique:4},{...base.pagePractice,correct:2},{...base.pagePractice,incorrect:-1}])expect(parseAnalyticsActivity({...base,pagePractice:invalid})).toBeNull();
    expect(parseAnalyticsActivity(localAnalyticsActivity([]))).not.toBeNull();
  });
  it("uses Vietnam calendar midnight", () => {
    expect(accessDay(Date.parse("2026-09-10T16:59:59Z"))).toBe("2026-09-10");
    expect(accessDay(Date.parse("2026-09-10T17:00:00Z"))).toBe("2026-09-11");
  });
  it("deduplicates receipts and items while counting retries and hinted practice as practice", () => {
    const result = localAnalyticsActivity([evidence("a"), evidence("a"), evidence("b", { metadata: { usedHint: true } }), evidence("c", { activityId: "item-2", outcome: "incorrect" }), evidence("d", { method: "lesson-completion" })]);
    expect(result.skills.vocabulary).toEqual({ attempts: 3, unique: 2, correct: 2 });
    expect(result.days).toEqual([{ day: "2026-09-11", count: 3 }]);
    expect(result.skills.speaking.attempts).toBe(0);
    expect(parseAnalyticsActivity(result)).toEqual(result);
    expect(parseAnalyticsActivity({ ...result, accessDays: [123] })).toBeNull();
  });
  it("counts device speech without promoting transcripts or recounting normalized lesson evidence", () => {
    const base = localAnalyticsActivity([evidence("lesson")]);
    const result = withDevicePractice(base, [evidence("lesson"), evidence("speech", { method: "speech-transcript", source: "pronunciation", skill: "speaking", outcome: "unverified", score: null })])!;
    expect(result.skills.vocabulary.attempts).toBe(1);
    expect(result.skills.speaking).toEqual({ attempts: 1, unique: 1, correct: 0 });
    expect(withDevicePractice(null, [])).toBeNull();
  });
});
