import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assessAzurePronunciation,
  AzurePronunciationAudioError,
  AzurePronunciationConfigurationError,
  AzurePronunciationNoMatchError,
  AzurePronunciationProtocolError,
  AzurePronunciationRemoteError,
  AzurePronunciationTimeoutError,
  createAzurePronunciationAssessmentHeader,
  parseAzurePronunciationResponse,
  validateAzurePcmWav,
  validateAzurePronunciationConfig,
  type AzurePronunciationConfig,
  type AzurePronunciationFetch,
} from "./azurePronunciation";

const config: AzurePronunciationConfig = {
  subscriptionKey: "1234567890abcdef1234567890abcdef",
  region: "southeastasia",
};

const createPcmWav = (
  dataByteLength = 3_200,
  overrides: Partial<{
    audioFormat: number;
    channels: number;
    sampleRate: number;
    byteRate: number;
    blockAlign: number;
    bitsPerSample: number;
  }> = {},
) => {
  const bytes = new Uint8Array(44 + dataByteLength);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      bytes[offset + index] = value.charCodeAt(index);
    }
  };
  ascii(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, overrides.audioFormat ?? 1, true);
  view.setUint16(22, overrides.channels ?? 1, true);
  view.setUint32(24, overrides.sampleRate ?? 16_000, true);
  view.setUint32(28, overrides.byteRate ?? 32_000, true);
  view.setUint16(32, overrides.blockAlign ?? 2, true);
  view.setUint16(34, overrides.bitsPerSample ?? 16, true);
  ascii(36, "data");
  view.setUint32(40, dataByteLength, true);
  return bytes;
};

const responsePayload = (overrides: Record<string, unknown> = {}) => ({
  RecognitionStatus: "Success",
  DisplayText: "你好。",
  NBest: [
    {
      Display: "你好。",
      AccuracyScore: 81,
      FluencyScore: 76,
      CompletenessScore: 100,
      PronScore: 82,
      Words: [
        {
          Word: "你好",
          AccuracyScore: 81,
          ErrorType: "None",
          Phonemes: [
            {
              Phoneme: "n",
              AccuracyScore: 79,
            },
            {
              Phoneme: "i3",
              AccuracyScore: 83,
            },
          ],
        },
      ],
    },
  ],
  ...overrides,
});

const jsonResponse = (payload: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });

afterEach(() => {
  vi.useRealTimers();
});

describe("Azure Speech pronunciation assessment adapter", () => {
  it("validates a bounded server-only resource key and region", () => {
    expect(validateAzurePronunciationConfig(config)).toEqual(config);
    expect(() =>
      validateAzurePronunciationConfig({
        ...config,
        subscriptionKey: "short",
      }),
    ).toThrow(AzurePronunciationConfigurationError);
    expect(() =>
      validateAzurePronunciationConfig({
        ...config,
        region: "southeastasia.attacker.example",
      }),
    ).toThrow(AzurePronunciationConfigurationError);
  });

  it("accepts only bounded PCM16 16 kHz mono WAV audio", () => {
    expect(validateAzurePcmWav(createPcmWav())).toEqual({
      byteLength: 3_244,
      dataByteLength: 3_200,
      durationMs: 100,
      sampleRate: 16_000,
      channels: 1,
      bitsPerSample: 16,
    });
    expect(() => validateAzurePcmWav(createPcmWav(3_200, { channels: 2 })))
      .toThrow(AzurePronunciationAudioError);
    expect(() => validateAzurePcmWav(createPcmWav(3_200, { sampleRate: 8_000 })))
      .toThrow(AzurePronunciationAudioError);
    expect(() => validateAzurePcmWav(createPcmWav(480_002)))
      .toThrow(AzurePronunciationAudioError);
  });

  it("rejects malformed RIFF sizes and unsafe reference text", () => {
    const wav = createPcmWav();
    new DataView(wav.buffer).setUint32(4, 12, true);
    expect(() => validateAzurePcmWav(wav)).toThrow(AzurePronunciationAudioError);
    expect(() => createAzurePronunciationAssessmentHeader("你好\nsecret"))
      .toThrow(AzurePronunciationConfigurationError);
    expect(() => createAzurePronunciationAssessmentHeader("plain text"))
      .toThrow(AzurePronunciationConfigurationError);
  });

  it("encodes the documented phoneme-level assessment parameters as UTF-8 base64", () => {
    const header = createAzurePronunciationAssessmentHeader("你好！");
    expect(JSON.parse(Buffer.from(header, "base64").toString("utf8"))).toEqual({
      ReferenceText: "你好！",
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      EnableMiscue: true,
    });
  });

  it("parses aggregate, word, and phoneme evidence without claiming tone or mastery", () => {
    expect(parseAzurePronunciationResponse(responsePayload())).toEqual({
      provider: "azure-speech-pronunciation-assessment",
      providerApi: "short-audio-rest-v1",
      locale: "zh-CN",
      transcript: "你好。",
      aggregate: {
        accuracyScore: 81,
        fluencyScore: 76,
        completenessScore: 100,
        pronunciationScore: 82,
      },
      words: [
        {
          word: "你好",
          accuracyScore: 81,
          errorType: "None",
          phonemes: [
            { phoneme: "n", accuracyScore: 79 },
            { phoneme: "i3", accuracyScore: 83 },
          ],
        },
      ],
      lexicalToneAssessment: "not-reported-by-provider",
      calibration: "unapproved",
      masteryEligible: false,
    });
  });

  it("fails closed on no-match and malformed provider scores", () => {
    expect(() =>
      parseAzurePronunciationResponse({ RecognitionStatus: "NoMatch" }),
    ).toThrow(AzurePronunciationNoMatchError);

    const malformed = responsePayload();
    const nBest = malformed.NBest[0];
    nBest.AccuracyScore = 101;
    expect(() => parseAzurePronunciationResponse(malformed))
      .toThrow(AzurePronunciationProtocolError);
  });

  it("accepts a nested SDK-compatible score shape only as a fallback", () => {
    const payload = structuredClone(responsePayload()) as Record<string, unknown>;
    const best = (payload.NBest as Record<string, unknown>[])[0];
    const word = (best.Words as Record<string, unknown>[])[0];
    const phoneme = (word.Phonemes as Record<string, unknown>[])[0];
    best.PronunciationAssessment = {
      AccuracyScore: best.AccuracyScore,
      FluencyScore: best.FluencyScore,
      CompletenessScore: best.CompletenessScore,
      PronScore: best.PronScore,
    };
    delete best.AccuracyScore;
    delete best.FluencyScore;
    delete best.CompletenessScore;
    delete best.PronScore;
    word.PronunciationAssessment = {
      AccuracyScore: word.AccuracyScore,
      ErrorType: word.ErrorType,
    };
    delete word.AccuracyScore;
    delete word.ErrorType;
    phoneme.PronunciationAssessment = {
      AccuracyScore: phoneme.AccuracyScore,
    };
    delete phoneme.AccuracyScore;

    expect(parseAzurePronunciationResponse(payload).aggregate).toEqual({
      accuracyScore: 81,
      fluencyScore: 76,
      completenessScore: 100,
      pronunciationScore: 82,
    });
  });

  it("posts only to the fixed regional host with a detailed zh-CN request", async () => {
    const captured: { url?: URL; init?: RequestInit } = {};
    const fetchImpl: AzurePronunciationFetch = async (url, init) => {
      captured.url = new URL(url);
      captured.init = init;
      return jsonResponse(responsePayload());
    };

    const result = await assessAzurePronunciation({
      config,
      referenceText: "你好！",
      wavBytes: createPcmWav(),
      fetchImpl,
    });

    expect(captured.url?.origin).toBe(
      "https://southeastasia.stt.speech.microsoft.com",
    );
    expect(captured.url?.pathname).toBe(
      "/speech/recognition/conversation/cognitiveservices/v1",
    );
    expect(captured.url?.searchParams.get("language")).toBe("zh-CN");
    expect(captured.url?.searchParams.get("format")).toBe("detailed");
    expect(captured.url?.searchParams.get("profanity")).toBe("raw");
    expect(captured.init?.method).toBe("POST");
    expect(captured.init?.redirect).toBe("manual");
    expect(captured.init?.headers).toMatchObject({
      "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
    });
    expect(captured.init?.signal).toBeInstanceOf(AbortSignal);
    expect(result.aggregate.pronunciationScore).toBe(82);
    expect(JSON.stringify(result)).not.toContain(config.subscriptionKey);
  });

  it("does not expose response bodies or resource keys in remote errors", async () => {
    const secretBody = `provider diagnostic ${config.subscriptionKey}`;
    const fetchImpl: AzurePronunciationFetch = async () =>
      new Response(secretBody, { status: 401 });

    let caught: unknown;
    try {
      await assessAzurePronunciation({
        config,
        referenceText: "你好",
        wavBytes: createPcmWav(),
        fetchImpl,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AzurePronunciationRemoteError);
    expect((caught as AzurePronunciationRemoteError).status).toBe(401);
    expect(String(caught)).not.toContain(secretBody);
    expect(String(caught)).not.toContain(config.subscriptionKey);
  });

  it("rejects redirects instead of forwarding the resource key", async () => {
    const fetchImpl: AzurePronunciationFetch = async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://example.test/capture" },
      });

    await expect(assessAzurePronunciation({
      config,
      referenceText: "你好",
      wavBytes: createPcmWav(),
      fetchImpl,
    })).rejects.toBeInstanceOf(AzurePronunciationProtocolError);
  });

  it("maps transport failures to a sanitized remote error", async () => {
    const fetchImpl: AzurePronunciationFetch = async () => {
      throw new Error(`network dump ${config.subscriptionKey}`);
    };
    await expect(
      assessAzurePronunciation({
        config,
        referenceText: "你好",
        wavBytes: createPcmWav(),
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: "AZURE_PRONUNCIATION_REMOTE_ERROR",
      status: null,
      message: "Azure Speech could not be reached.",
    });
  });

  it("aborts and settles when the bounded timeout elapses", async () => {
    vi.useFakeTimers();
    const captured: { signal?: AbortSignal } = {};
    const fetchImpl: AzurePronunciationFetch = async (_url, init) => {
      if (init.signal) captured.signal = init.signal;
      return new Promise<Response>(() => undefined);
    };
    const assessment = assessAzurePronunciation({
      config,
      referenceText: "你好",
      wavBytes: createPcmWav(),
      fetchImpl,
      timeoutMs: 25,
    });
    const rejection = expect(assessment).rejects.toBeInstanceOf(
      AzurePronunciationTimeoutError,
    );

    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    expect(captured.signal?.aborted).toBe(true);
  });
});
