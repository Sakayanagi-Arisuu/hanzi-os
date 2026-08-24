import { describe, expect, it } from "vitest";
import {
  analyzeTraceAgainstMedian,
  getStrokeScaffoldVisibility,
  shouldAdvanceStrokeAttempt,
  shouldOfferStrokeRescue,
  traceMatchesMedian,
} from "./StrokeOrderPractice";

describe("stroke order trace tolerance", () => {
  const median = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 500, y: 120 },
  ];

  it("accepts an imprecise mouse trace that follows the intended direction", () => {
    expect(traceMatchesMedian([
      { x: 118, y: 124 },
      { x: 205, y: 88 },
      { x: 315, y: 119 },
      { x: 475, y: 146 },
    ], median)).toBe(true);
  });

  it("rejects a trace drawn backwards even when it follows the same line", () => {
    expect(traceMatchesMedian([
      { x: 492, y: 122 },
      { x: 390, y: 111 },
      { x: 260, y: 101 },
      { x: 112, y: 98 },
    ], median)).toBe(false);
  });

  it("accepts a beginner trace with a loose start point when direction and body are recognizable", () => {
    const analysis = analyzeTraceAgainstMedian([
      { x: 310, y: 150 },
      { x: 350, y: 126 },
      { x: 430, y: 118 },
      { x: 540, y: 142 },
    ], median);

    expect(analysis.passed).toBe(true);
    expect(analysis.feedback).toContain("Đúng hướng");
  });
});

describe("memory reconstruction scaffold", () => {
  it("keeps only the positioning grid visible when recall starts", () => {
    expect(getStrokeScaffoldVisibility({
      variant: "memory",
      assistance: 5,
      memoryReferenceVisible: false,
      memoryStrokeHintVisible: false,
      playing: false,
      complete: false,
    })).toEqual({
      grid: true,
      memoryReference: false,
      strokeShapes: false,
      strokeGuide: false,
    });
  });

  it("reveals the fitted geometry reference only after an explicit memory hint", () => {
    expect(getStrokeScaffoldVisibility({
      variant: "memory",
      assistance: 3,
      memoryReferenceVisible: true,
      memoryStrokeHintVisible: false,
      playing: false,
      complete: false,
    })).toEqual({
      grid: true,
      memoryReference: true,
      strokeShapes: false,
      strokeGuide: false,
    });
  });

  it("reveals only the current stroke guide after a miss", () => {
    expect(getStrokeScaffoldVisibility({
      variant: "memory",
      assistance: 3,
      memoryReferenceVisible: false,
      memoryStrokeHintVisible: true,
      playing: false,
      complete: false,
    })).toEqual({
      grid: true,
      memoryReference: false,
      strokeShapes: false,
      strokeGuide: true,
    });
  });
});

describe("guided stroke flow", () => {
  it("records one intentional guided attempt without trapping the learner on the same stroke", () => {
    expect(shouldAdvanceStrokeAttempt({ variant: "guided", pointCount: 6, passed: false })).toBe(true);
  });

  it("still ignores an accidental tap and keeps recall strict", () => {
    expect(shouldAdvanceStrokeAttempt({ variant: "guided", pointCount: 1, passed: false })).toBe(false);
    expect(shouldAdvanceStrokeAttempt({ variant: "memory", pointCount: 6, passed: false })).toBe(false);
  });

  it("offers a recovery path immediately in guided practice and after two recall misses", () => {
    expect(shouldOfferStrokeRescue("guided", 0)).toBe(true);
    expect(shouldOfferStrokeRescue("memory", 1)).toBe(false);
    expect(shouldOfferStrokeRescue("memory", 2)).toBe(true);
  });
});
