import { statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SYSTEM_VOICE_CLIP_IDS,
  SYSTEM_VOICE_PACKS,
  systemVoiceClipForSignal,
  systemVoiceClipUrl,
} from "./systemVoicePack";

describe("Cơ Linh Mechanical Core voice pack", () => {
  it("ships the complete local system announcement palette", () => {
    expect(SYSTEM_VOICE_CLIP_IDS).toHaveLength(16);
    expect(systemVoiceClipForSignal("lesson.completed")).toBe("lesson.completed");
    expect(systemVoiceClipForSignal("journey.promoted")).toBe("journey.promoted");
    expect(systemVoiceClipUrl("oracle", "system.online")).toBe(
      "/assets/system-voice/oracle-v2/system-online.mp3",
    );
  });

  it("keeps synthetic provenance and review disclosure explicit", () => {
    expect(Object.keys(SYSTEM_VOICE_PACKS)).toEqual(["mechanical", "oracle", "executor", "guide"]);
    for (const pack of Object.values(SYSTEM_VOICE_PACKS)) {
      expect(pack).toMatchObject({
        synthetic: true,
        humanReviewed: false,
        localStudyOnly: true,
      });
    }
  });

  it("binds every manifest entry to a non-empty runtime asset", () => {
    for (const pack of Object.values(SYSTEM_VOICE_PACKS)) {
      for (const clipId of SYSTEM_VOICE_CLIP_IDS) {
        const path = resolve(
          process.cwd(),
          `public${pack.basePath}`,
          `${clipId.replaceAll(".", "-")}.mp3`,
        );
        expect(statSync(path).size).toBeGreaterThan(10_000);
      }
    }
  });
});
