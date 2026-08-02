import { describe, expect, it } from "vitest";
import { CUE_CATALOG, SIGNAL_CUE_MAP } from "./cueCatalog";

describe("living system cue catalog", () => {
  it("ships a broad semantic palette instead of a single generic click", () => {
    expect(Object.keys(CUE_CATALOG).length).toBeGreaterThanOrEqual(30);
    expect(CUE_CATALOG["system.boot"].tones.length).toBeGreaterThan(3);
    expect(CUE_CATALOG["journey.promotion"].priority).toBe(3);
    expect(CUE_CATALOG["voice.record-start"]).not.toEqual(CUE_CATALOG["ui.select"]);
    expect(CUE_CATALOG["system.boot"]).toMatchObject({
      channel: "effects",
      duckPolicy: "follow-voice",
    });
    expect(CUE_CATALOG["system.boot"].duration).toBeGreaterThan(0);
    expect(CUE_CATALOG["system.boot"].visualEnvelope).toHaveLength(3);
  });

  it("maps high-value learning signals to distinct reactions", () => {
    expect(SIGNAL_CUE_MAP["lesson.completed"]).toBe("lesson.clear");
    expect(SIGNAL_CUE_MAP["review.queue-cleared"]).toBe("review.queue-clear");
    expect(SIGNAL_CUE_MAP["level-check.completed"]).toBe("level-check.result");
    expect(SIGNAL_CUE_MAP["mistake.resolved"]).toBe("mistake.resolved");
    expect(SIGNAL_CUE_MAP["state.restored"]).toBe("state.sync");
  });
});
