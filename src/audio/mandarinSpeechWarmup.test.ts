import { describe, expect, it, vi } from "vitest";
import { createMandarinSpeechPreparer } from "./mandarinSpeechWarmup";

describe("createMandarinSpeechPreparer", () => {
  it("eagerly loads voices without queueing a silent utterance", () => {
    const getVoices = vi.fn(() => []);
    const prepare = createMandarinSpeechPreparer({ getVoices });

    expect(prepare()).toBe(true);
    expect(getVoices).toHaveBeenCalledTimes(1);
    expect(prepare()).toBe(true);
    expect(getVoices).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the browser rejects voice discovery", () => {
    const getVoices = vi
      .fn()
      .mockImplementationOnce(() => { throw new Error("blocked"); })
      .mockImplementationOnce(() => []);
    const prepare = createMandarinSpeechPreparer({ getVoices });

    expect(prepare()).toBe(false);
    expect(prepare()).toBe(true);
    expect(getVoices).toHaveBeenCalledTimes(2);
  });
});
