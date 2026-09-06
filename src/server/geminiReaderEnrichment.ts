const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_INPUT_CHARACTERS = 60_000;
const MAX_RESPONSE_CHARACTERS = 500_000;

export type ReaderEnrichmentInput = Readonly<{
  titleZh: string;
  chapters: readonly Readonly<{
    titleZh: string;
    paragraphs: readonly string[];
  }>[];
}>;

export type ReaderEnrichmentResult = Readonly<{
  titleVi: string;
  synopsisVi: string;
  hookVi: string;
  chapters: readonly Readonly<{
    titleVi: string;
    hookVi: string;
    estimatedMinutes: number;
    paragraphs: readonly Readonly<{
      pinyin: string;
      vi: string;
    }>[];
  }>[];
  aiAssisted: true;
  humanReviewed: false;
}>;

export type GeminiReaderConfig = Readonly<{
  apiKey: string;
  model?: string;
}>;

export class ReaderEnrichmentInputError extends Error {
  readonly code = "READER_ENRICHMENT_INPUT_INVALID";
}

export class ReaderEnrichmentConfigurationError extends Error {
  readonly code = "READER_ENRICHMENT_NOT_CONFIGURED";
}

export class ReaderEnrichmentRemoteError extends Error {
  readonly code = "READER_ENRICHMENT_REMOTE_ERROR";
  constructor(readonly status: number | null) {
    super("Gemini could not complete the reader enrichment request.");
  }
}

export class ReaderEnrichmentProtocolError extends Error {
  readonly code = "READER_ENRICHMENT_PROTOCOL_INVALID";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const boundedText = (value: unknown, maximum: number): value is string => typeof value === "string"
  && value === value.trim()
  && value.length > 0
  && value.length <= maximum;

const inputError = (message: string): never => {
  throw new ReaderEnrichmentInputError(message);
};

const protocolError = (message: string): never => {
  throw new ReaderEnrichmentProtocolError(message);
};

export const validateReaderEnrichmentInput = (value: unknown): ReaderEnrichmentInput => {
  const record = isRecord(value) ? value : inputError("Dữ liệu sách chưa hợp lệ.");
  const titleZh = boundedText(record.titleZh, 80) ? record.titleZh : inputError("Tên sách tiếng Trung chưa hợp lệ.");
  if (!/\p{Script=Han}/u.test(titleZh)) inputError("Tên sách tiếng Trung chưa hợp lệ.");
  const rawChapters = Array.isArray(record.chapters) ? record.chapters : inputError("Sách cần từ 1 đến 50 chương.");
  if (rawChapters.length < 1 || rawChapters.length > 50) inputError("Sách cần từ 1 đến 50 chương.");
  let totalCharacters = titleZh.length;
  const chapters = rawChapters.map((rawCandidate: unknown, chapterIndex: number) => {
    const candidate = isRecord(rawCandidate) ? rawCandidate : inputError(`Chương ${chapterIndex + 1} chưa hợp lệ.`);
    const chapterTitleZh = boundedText(candidate.titleZh, 100)
      ? candidate.titleZh
      : inputError(`Tiêu đề chương ${chapterIndex + 1} chưa hợp lệ.`);
    if (!/\p{Script=Han}/u.test(chapterTitleZh)) inputError(`Tiêu đề chương ${chapterIndex + 1} chưa hợp lệ.`);
    const rawParagraphs = Array.isArray(candidate.paragraphs)
      ? candidate.paragraphs
      : inputError(`Chương ${chapterIndex + 1} cần từ 2 đến 40 đoạn.`);
    if (rawParagraphs.length < 2 || rawParagraphs.length > 40) inputError(`Chương ${chapterIndex + 1} cần từ 2 đến 40 đoạn.`);
    const paragraphs = rawParagraphs.map((rawParagraph: unknown, paragraphIndex: number) => {
      const paragraph = boundedText(rawParagraph, 2_000)
        ? rawParagraph
        : inputError(`Đoạn ${paragraphIndex + 1} của chương ${chapterIndex + 1} chưa hợp lệ.`);
      if (!/\p{Script=Han}/u.test(paragraph)) inputError(`Đoạn ${paragraphIndex + 1} của chương ${chapterIndex + 1} chưa hợp lệ.`);
      totalCharacters += paragraph.length;
      return paragraph;
    });
    totalCharacters += chapterTitleZh.length;
    return { titleZh: chapterTitleZh, paragraphs };
  });
  if (totalCharacters > MAX_INPUT_CHARACTERS) inputError("Bản thảo vượt giới hạn xử lý trong một lần.");
  return { titleZh, chapters };
};

export const validateGeminiReaderConfig = (config: GeminiReaderConfig) => {
  const apiKey = config.apiKey.trim();
  const model = (config.model?.trim() || DEFAULT_MODEL);
  if (apiKey.length < 16 || apiKey.length > 256 || /\s/u.test(apiKey)) {
    throw new ReaderEnrichmentConfigurationError("Gemini API key is absent or malformed.");
  }
  if (!/^[a-z0-9][a-z0-9._-]{1,80}$/u.test(model)) {
    throw new ReaderEnrichmentConfigurationError("Gemini model name is malformed.");
  }
  return { apiKey, model } as const;
};

export const parseReaderEnrichmentResult = (
  value: unknown,
  input: ReaderEnrichmentInput,
): ReaderEnrichmentResult => {
  const record = isRecord(value) ? value : protocolError("Gemini returned malformed book metadata.");
  const titleVi = boundedText(record.titleVi, 120) ? record.titleVi : protocolError("Gemini returned incomplete book metadata.");
  const synopsisVi = boundedText(record.synopsisVi, 2_000) ? record.synopsisVi : protocolError("Gemini returned incomplete book metadata.");
  const hookVi = boundedText(record.hookVi, 600) ? record.hookVi : protocolError("Gemini returned incomplete book metadata.");
  const rawChapters = Array.isArray(record.chapters) ? record.chapters : protocolError("Gemini returned incomplete book metadata.");
  if (rawChapters.length !== input.chapters.length) protocolError("Gemini returned incomplete book metadata.");
  const chapters = rawChapters.map((rawCandidate: unknown, chapterIndex: number) => {
    const source = input.chapters[chapterIndex] ?? protocolError(`Gemini returned an invalid chapter ${chapterIndex + 1}.`);
    const candidate = isRecord(rawCandidate) ? rawCandidate : protocolError(`Gemini returned an invalid chapter ${chapterIndex + 1}.`);
    const chapterTitleVi = boundedText(candidate.titleVi, 160) ? candidate.titleVi : protocolError(`Gemini returned an invalid chapter ${chapterIndex + 1}.`);
    const chapterHookVi = boundedText(candidate.hookVi, 600) ? candidate.hookVi : protocolError(`Gemini returned an invalid chapter ${chapterIndex + 1}.`);
    const estimatedMinutes = typeof candidate.estimatedMinutes === "number" && Number.isInteger(candidate.estimatedMinutes)
      ? candidate.estimatedMinutes
      : protocolError(`Gemini returned an invalid chapter ${chapterIndex + 1}.`);
    if (estimatedMinutes < 1 || estimatedMinutes > 60) protocolError(`Gemini returned an invalid chapter ${chapterIndex + 1}.`);
    const rawParagraphs = Array.isArray(candidate.paragraphs)
      ? candidate.paragraphs
      : protocolError(`Gemini returned an invalid chapter ${chapterIndex + 1}.`);
    if (rawParagraphs.length !== source.paragraphs.length) protocolError(`Gemini returned an invalid chapter ${chapterIndex + 1}.`);
    const paragraphs = rawParagraphs.map((rawParagraph: unknown, paragraphIndex: number) => {
      const paragraph = isRecord(rawParagraph) ? rawParagraph : protocolError(`Gemini returned an invalid paragraph ${paragraphIndex + 1}.`);
      const pinyin = boundedText(paragraph.pinyin, 4_000) ? paragraph.pinyin : protocolError(`Gemini returned an invalid paragraph ${paragraphIndex + 1}.`);
      const vi = boundedText(paragraph.vi, 4_000) ? paragraph.vi : protocolError(`Gemini returned an invalid paragraph ${paragraphIndex + 1}.`);
      return { pinyin, vi };
    });
    return {
      titleVi: chapterTitleVi,
      hookVi: chapterHookVi,
      estimatedMinutes,
      paragraphs,
    };
  });
  return {
    titleVi,
    synopsisVi,
    hookVi,
    chapters,
    aiAssisted: true,
    humanReviewed: false,
  };
};

const responseSchema = {
  type: "OBJECT",
  properties: {
    titleVi: { type: "STRING" },
    synopsisVi: { type: "STRING" },
    hookVi: { type: "STRING" },
    chapters: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titleVi: { type: "STRING" },
          hookVi: { type: "STRING" },
          estimatedMinutes: { type: "INTEGER" },
          paragraphs: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                pinyin: { type: "STRING" },
                vi: { type: "STRING" },
              },
              required: ["pinyin", "vi"],
            },
          },
        },
        required: ["titleVi", "hookVi", "estimatedMinutes", "paragraphs"],
      },
    },
  },
  required: ["titleVi", "synopsisVi", "hookVi", "chapters"],
} as const;

type GeminiFetch = (input: string | URL, init: RequestInit) => Promise<Response>;

export async function enrichReaderWithGemini({
  config,
  input: rawInput,
  fetchImpl = fetch,
  timeoutMs = 25_000,
}: {
  config: GeminiReaderConfig;
  input: unknown;
  fetchImpl?: GeminiFetch;
  timeoutMs?: number;
}): Promise<ReaderEnrichmentResult> {
  const input = validateReaderEnrichmentInput(rawInput);
  const validatedConfig = validateGeminiReaderConfig(config);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(
      `${GEMINI_ENDPOINT}/${encodeURIComponent(validatedConfig.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": validatedConfig.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "Bạn là biên tập viên tiếng Trung giản thể cho người Việt. Giữ đúng số chương và số đoạn. Không thêm hoặc xóa ý. Tạo Pinyin có dấu thanh, bản dịch tiếng Việt tự nhiên, tiêu đề và câu dẫn ngắn. Chỉ trả JSON theo schema." }],
          },
          contents: [{ parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 16_384,
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
        signal: controller.signal,
      },
    );
  } catch {
    throw new ReaderEnrichmentRemoteError(null);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new ReaderEnrichmentRemoteError(response.status);
  const payloadText = await response.text();
  if (payloadText.length > MAX_RESPONSE_CHARACTERS) protocolError("Gemini response exceeded the safety bound.");
  let payload: unknown;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    protocolError("Gemini returned malformed JSON.");
  }
  const root = isRecord(payload) ? payload : null;
  const candidates = root && Array.isArray(root.candidates) ? root.candidates : [];
  const candidate = isRecord(candidates[0]) ? candidates[0] : null;
  const content = candidate && isRecord(candidate.content) ? candidate.content : null;
  const parts = content && Array.isArray(content.parts) ? content.parts : [];
  const part = isRecord(parts[0]) ? parts[0] : null;
  const structuredText = typeof part?.text === "string"
    ? part.text
    : protocolError("Gemini response did not contain structured text.");
  let result: unknown;
  try {
    result = JSON.parse(structuredText);
  } catch {
    protocolError("Gemini structured text was not valid JSON.");
  }
  return parseReaderEnrichmentResult(result, input);
}
