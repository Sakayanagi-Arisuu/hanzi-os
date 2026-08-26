import { describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION, RELEASED_WORD_BY_ID } from "../data/curriculum";
import { ACOUSTIC_VOICE_CONSENT_POLICY_VERSION } from "../lib/acousticVoiceConsent";
import {
  AzurePronunciationConfigurationError,
  AzurePronunciationNoMatchError,
  AzurePronunciationProtocolError,
  AzurePronunciationRemoteError,
  AzurePronunciationTimeoutError,
  type AzurePronunciationAssessment,
} from "./azurePronunciation";
import {
  handleLocalPronunciationAssessment,
  type LocalPronunciationAssessor,
  type LocalPronunciationEnvironment,
} from "./localPronunciationAssessmentRoute";

const activityId = `pronunciation:${CONTENT_VERSION}:chi`;
const subscriptionKey = "local-f0-secret-1234567890abcdef";
const enabledEnvironment: LocalPronunciationEnvironment = {
  NODE_ENV: "development",
  HANZI_OS_AZURE_PRONUNCIATION_LOCAL_ENABLED: "true",
  AZURE_SPEECH_SUBSCRIPTION_KEY: subscriptionKey,
  AZURE_SPEECH_REGION: "southeastasia",
};

const assessment: AzurePronunciationAssessment = {
  provider: "azure-speech-pronunciation-assessment",
  providerApi: "short-audio-rest-v1",
  locale: "zh-CN",
  transcript: "我吃米饭。",
  aggregate: {
    accuracyScore: 81,
    fluencyScore: 76,
    completenessScore: 100,
    pronunciationScore: 82,
  },
  words: [
    {
      word: "吃",
      accuracyScore: 81,
      errorType: "None",
      phonemes: [{ phoneme: "ch", accuracyScore: 80 }],
    },
  ],
  lexicalToneAssessment: "not-reported-by-provider",
  calibration: "unapproved",
  masteryEligible: false,
};

const createPcmWav = (dataByteLength = 3_200) => {
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
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16_000, true);
  view.setUint32(28, 32_000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataByteLength, true);
  return bytes;
};

const localRequest = (
  overrides: Readonly<{
    url?: string;
    origin?: string;
    host?: string;
    contentType?: string;
    consentPolicy?: string;
    activity?: string;
    body?: Uint8Array;
    contentLength?: string;
  }> = {},
) => {
  const url = overrides.url ?? "http://localhost:3000/api/speech/pronunciation/assess";
  const headers = new Headers({
    host: overrides.host ?? "localhost:3000",
    origin: overrides.origin ?? "http://localhost:3000",
    "content-type": overrides.contentType ?? "audio/wav",
    "x-hanzi-acoustic-consent-policy": overrides.consentPolicy
      ?? ACOUSTIC_VOICE_CONSENT_POLICY_VERSION,
    "x-hanzi-pronunciation-activity-id": overrides.activity ?? activityId,
  });
  if (overrides.contentLength !== undefined) {
    headers.set("content-length", overrides.contentLength);
  }
  return new Request(url, {
    method: "POST",
    headers,
    body: Uint8Array.from(overrides.body ?? createPcmWav()).buffer,
  });
};

const successfulAssessor = vi.fn<LocalPronunciationAssessor>(async () => assessment);

const responseBody = async (response: Response) => {
  const body: unknown = await response.json();
  return body;
};

describe("local-only pronunciation assessment route", () => {
  it("is disabled by default and requires both explicit development gates", async () => {
    const disabled = await handleLocalPronunciationAssessment(localRequest(), {
      environment: {},
      assessor: successfulAssessor,
    });
    const production = await handleLocalPronunciationAssessment(localRequest(), {
      environment: {
        ...enabledEnvironment,
        NODE_ENV: "production",
      },
      assessor: successfulAssessor,
    });

    expect(disabled.status).toBe(404);
    expect(production.status).toBe(404);
    expect(disabled.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects a non-loopback URL, origin, or host before invoking Azure", async () => {
    const assessor = vi.fn<LocalPronunciationAssessor>(async () => assessment);
    const requests = [
      localRequest({
        url: "https://hanzi.example/api/speech/pronunciation/assess",
        origin: "https://hanzi.example",
        host: "hanzi.example",
      }),
      localRequest({ origin: "https://attacker.example" }),
      localRequest({ host: "attacker.example" }),
    ];

    for (const request of requests) {
      const response = await handleLocalPronunciationAssessment(request, {
        environment: enabledEnvironment,
        assessor,
      });
      expect(response.status).toBe(404);
    }
    expect(assessor).not.toHaveBeenCalled();
  });

  it("requires the exact current consent policy", async () => {
    const response = await handleLocalPronunciationAssessment(
      localRequest({ consentPolicy: "old-policy" }),
      { environment: enabledEnvironment, assessor: successfulAssessor },
    );

    expect(response.status).toBe(428);
    expect(await responseBody(response)).toMatchObject({
      error: { code: "ACOUSTIC_CONSENT_REQUIRED", retryable: false },
    });
  });

  it("resolves only a released activity and never accepts a client reference", async () => {
    const assessor = vi.fn<LocalPronunciationAssessor>(async () => assessment);
    const unknown = await handleLocalPronunciationAssessment(
      localRequest({
        activity: `pronunciation:${CONTENT_VERSION}:not-released`,
      }),
      { environment: enabledEnvironment, assessor },
    );
    expect(unknown.status).toBe(422);
    expect(assessor).not.toHaveBeenCalled();

    const response = await handleLocalPronunciationAssessment(localRequest(), {
      environment: enabledEnvironment,
      assessor,
    });
    expect(response.status).toBe(200);
    expect(assessor).toHaveBeenCalledWith(expect.objectContaining({
      referenceText: RELEASED_WORD_BY_ID.get("chi")?.example,
      wavBytes: expect.any(Uint8Array),
    }));
  });

  it("requires the exact raw WAV content type and bounds streamed audio", async () => {
    const wrongType = await handleLocalPronunciationAssessment(
      localRequest({ contentType: "audio/wav; charset=utf-8" }),
      { environment: enabledEnvironment, assessor: successfulAssessor },
    );
    const tooLarge = await handleLocalPronunciationAssessment(
      localRequest({
        body: new Uint8Array(512 * 1024 + 1),
      }),
      { environment: enabledEnvironment, assessor: successfulAssessor },
    );

    expect(wrongType.status).toBe(415);
    expect(tooLarge.status).toBe(413);
    expect(await responseBody(tooLarge)).toMatchObject({
      error: { code: "PRONUNCIATION_AUDIO_TOO_LARGE" },
    });
  });

  it("returns only normalized evidence with no-store headers and no secret", async () => {
    const assessor = vi.fn<LocalPronunciationAssessor>(async (input) => {
      expect(input.config).toEqual({
        subscriptionKey,
        region: "southeastasia",
      });
      return assessment;
    });
    const response = await handleLocalPronunciationAssessment(localRequest(), {
      environment: enabledEnvironment,
      assessor,
    });
    const serialized = JSON.stringify(await responseBody(response));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(serialized).toContain(activityId);
    expect(serialized).toContain("pronunciationScore");
    expect(serialized).not.toContain(subscriptionKey);
  });

  it("fails safely when the local F0 credentials are absent", async () => {
    const response = await handleLocalPronunciationAssessment(localRequest(), {
      environment: {
        NODE_ENV: "development",
        HANZI_OS_AZURE_PRONUNCIATION_LOCAL_ENABLED: "true",
      },
    });

    expect(response.status).toBe(503);
    expect(await responseBody(response)).toMatchObject({
      error: { code: "PRONUNCIATION_LOCAL_CONFIG_UNAVAILABLE" },
    });
  });

  it.each([
    [new AzurePronunciationRemoteError(429), 429, "PRONUNCIATION_FREE_QUOTA_UNAVAILABLE"],
    [new AzurePronunciationRemoteError(401), 503, "PRONUNCIATION_LOCAL_CONFIG_UNAVAILABLE"],
    [new AzurePronunciationConfigurationError("secret config"), 503, "PRONUNCIATION_LOCAL_CONFIG_UNAVAILABLE"],
    [new AzurePronunciationNoMatchError(), 422, "PRONUNCIATION_NO_MATCH"],
    [new AzurePronunciationTimeoutError(), 504, "PRONUNCIATION_TIMEOUT"],
    [new AzurePronunciationProtocolError("secret provider body"), 502, "PRONUNCIATION_RESULT_INVALID"],
  ] as const)(
    "maps provider failure %# to a safe local response",
    async (providerError, expectedStatus, expectedCode) => {
      const assessor: LocalPronunciationAssessor = async () => {
        throw providerError;
      };
      const response = await handleLocalPronunciationAssessment(localRequest(), {
        environment: enabledEnvironment,
        assessor,
      });
      const serialized = JSON.stringify(await responseBody(response));

      expect(response.status).toBe(expectedStatus);
      expect(serialized).toContain(expectedCode);
      expect(serialized).not.toContain(subscriptionKey);
    },
  );

  it("sanitizes unexpected errors even when their message contains a secret", async () => {
    const assessor: LocalPronunciationAssessor = async () => {
      throw new Error(`provider dump: ${subscriptionKey}`);
    };
    const response = await handleLocalPronunciationAssessment(localRequest(), {
      environment: enabledEnvironment,
      assessor,
    });
    const serialized = JSON.stringify(await responseBody(response));

    expect(response.status).toBe(503);
    expect(serialized).not.toContain(subscriptionKey);
    expect(serialized).not.toContain("provider dump");
  });
});
