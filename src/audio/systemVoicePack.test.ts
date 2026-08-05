import { statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SYSTEM_VOICE_CLIP_IDS,
  SYSTEM_VOICE_PACK,
  systemVoiceClipForSignal,
  systemVoiceClipUrl,
} from "./systemVoicePack";

describe("Cơ Linh Mechanical Core voice pack", () => {
  it("ships the complete local system announcement palette", () => {
    expect(SYSTEM_VOICE_CLIP_IDS).toHaveLength(16);
    expect(systemVoiceClipForSignal("lesson.completed")).toBe("lesson.completed");
    expect(systemVoiceClipForSignal("journey.promoted")).toBe("journey.promoted");
    expect(systemVoiceClipUrl("system.online")).toBe(
      "/assets/system-voice/mechanical-core-v1/system-online.mp3",
    );
  });

  it("keeps synthetic provenance and review disclosure explicit", () => {
    expect(SYSTEM_VOICE_PACK).toMatchObject({
      synthetic: true,
      humanReviewed: false,
      localStudyOnly: true,
    });
  });

  it("binds every manifest entry to a non-empty runtime asset", () => {
    for (const clipId of SYSTEM_VOICE_CLIP_IDS) {
      const path = resolve(
        process.cwd(),
        "public/assets/system-voice/mechanical-core-v1",
        `${clipId.replaceAll(".", "-")}.mp3`,
      );
      expect(statSync(path).size).toBeGreaterThan(10_000);
    }
  });
});
