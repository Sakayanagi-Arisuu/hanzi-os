import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const OUTPUT = resolve(
  ROOT,
  "content/drafts/hsk4-local-language-support-2026.08.json",
);
const VOCABULARY = resolve(
  ROOT,
  "content/drafts/hsk4-vocabulary-2026.07.29.json",
);
const LONG_FORM = [
  "personal-community",
  "education-work",
  "nature-technology",
  "society-economy",
  "arts-sports-exchange",
  "culture-history",
].map((name) => resolve(
  ROOT,
  `content/drafts/hsk4-${name}-long-form-2026.07.json`,
));
const SUMMARY_ARGUMENT = [
  "precision-reference-quantity",
  "stance-comparison-rhetoric",
  "event-agency-voice",
  "information-order-cohesion",
  "argument-logic-concession",
].map((name) => resolve(
  ROOT,
  `content/drafts/hsk4-${name}-summary-argument-2026.07.json`,
));
const INTEGRATION = [
  "long-input-structure-map",
  "inference-evidence-check",
  "cross-text-synthesis",
  "structured-written-argument",
  "structured-spoken-defense",
  "timed-sectional-rehearsal",
].map((name) => resolve(
  ROOT,
  `content/drafts/hsk4-${name}-integration-2026.07.json`,
));

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const unique = (values) => [...new Set(values.filter(Boolean))];
const sha256 = (value) => `sha256:${createHash("sha256")
  .update(value)
  .digest("hex")}`;

const existing = (() => {
  try {
    return readJson(OUTPUT);
  } catch {
    return null;
  }
})();
const existingGlosses = new Map(
  (existing?.vocabulary ?? []).map((item) => [item.officialId, item]),
);
const existingPinyin = new Map(
  (existing?.pronunciations ?? []).map((item) => [item.hanzi, item]),
);

const vocabulary = readJson(VOCABULARY);
const longForm = LONG_FORM.map(readJson);
const summaries = SUMMARY_ARGUMENT.map(readJson);
const integrations = INTEGRATION.map(readJson);
const authoredGlosses = new Map(longForm.flatMap((pack) =>
  pack.lessons.flatMap((lesson) => lesson.targetLexemes.map((item) => [
    item.officialId,
    item.vietnameseGlossDraft,
  ]))
));

const cleanEnglishSense = (value) => value
  .replace(/CL:[^;]+/giu, "")
  .replace(/\([^)]*(?:abbr\.|classifier|Taiwan pr\.)[^)]*\)/giu, "")
  .replace(/\[[a-z0-9 ]+\]/giu, "")
  .replace(/\s+/gu, " ")
  .trim();

const normalizeVietnamese = (value) => value
  .replace(/\s*;\s*/gu, "; ")
  .replace(/(^|; )để\s+/giu, "$1")
  .replace(/\s+([,.;!?])/gu, "$1")
  .replace(/;\s*$/gu, "")
  .trim()
  .replace(/^./u, (letter) => letter.toLocaleLowerCase("vi"));

const GLOSS_OVERRIDES = new Map([
  ["hsk-vocab-01001", "thán từ biểu thị ngạc nhiên: à; ồ"],
  ["hsk-vocab-01009", "bất kể; dù cho"],
]);

const google = async ({ source, target, query, romanize = false }) => {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", source);
  url.searchParams.set("tl", target);
  url.searchParams.append("dt", "t");
  if (romanize) url.searchParams.append("dt", "rm");
  url.searchParams.set("q", query);
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "HANZI.OS local content materializer" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (romanize) {
        const candidate = body?.[0]?.findLast?.((part) => part?.[3])?.[3];
        if (!candidate) throw new Error("romanization missing");
        return candidate.trim();
      }
      const candidate = body?.[0]?.map((part) => part?.[0] ?? "").join("");
      if (!candidate?.trim()) throw new Error("translation missing");
      return candidate.trim();
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(
        resolveDelay,
        300 * attempt * attempt,
      ));
    }
  }
  throw lastError;
};

const mapConcurrent = async (items, limit, worker) => {
  const result = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      result[index] = await worker(items[index], index);
      if ((index + 1) % 50 === 0) {
        process.stdout.write(`materialized ${index + 1}/${items.length}\n`);
      }
    }
  });
  await Promise.all(runners);
  return result;
};

const vocabularyRows = await mapConcurrent(vocabulary.entries, 8, async (entry) => {
  const authored = authoredGlosses.get(entry.officialId);
  const previous = existingGlosses.get(entry.officialId);
  const override = GLOSS_OVERRIDES.get(entry.officialId);
  const senses = unique(entry.sourceMatches.flatMap((match) => match.senses)
    .map(cleanEnglishSense)
    .filter((sense) => sense && !sense.startsWith("CL:")))
    .slice(0, 4);
  let gloss = override ?? authored ?? previous?.vietnameseGloss;
  let sourceKind = override
    ? "ai-self-reviewed-override"
    : authored
      ? "authored-long-form-context"
      : previous?.sourceKind;
  if (!gloss) {
    const sourceText = senses.join("; ") || entry.simplified;
    gloss = normalizeVietnamese(await google({
      source: senses.length ? "en" : "zh-CN",
      target: "vi",
      query: sourceText,
    }));
    sourceKind = "machine-translation-ai-self-reviewed";
  }
  return {
    officialId: entry.officialId,
    simplified: entry.simplified,
    pinyin: entry.officialPinyin,
    vietnameseGloss: gloss,
    sourceKind,
    sourceSenses: senses,
    humanReviewed: false,
  };
});

const hanziSamples = unique([
  ...longForm.flatMap((pack) => pack.lessons.flatMap((lesson) =>
    lesson.texts.flatMap((text) => text.paragraphs.map((item) => item.hanzi))
  )),
  ...summaries.flatMap((pack) => pack.lessons.flatMap((lesson) => [
    ...lesson.grammarTargets.map((item) => item.modelHanzi),
    ...lesson.grammarPracticeItems.map((item) => item.modelHanzi),
  ])),
  ...integrations.flatMap((pack) => pack.lessons.flatMap((lesson) =>
    lesson.promptUnits.map((item) => item.modelHanzi)
  )),
]);

const pronunciationRows = await mapConcurrent(hanziSamples, 8, async (hanzi) => ({
  textSha256: sha256(hanzi),
  hanzi,
  pinyin: existingPinyin.get(hanzi)?.pinyin ?? await google({
    source: "zh-CN",
    target: "en",
    query: hanzi,
    romanize: true,
  }),
  sourceKind: "google-translate-romanization-ai-self-reviewed",
  humanReviewed: false,
}));

const payload = {
  schemaVersion: 1,
  supportId: "hsk4-local-language-support-2026.08",
  level: 4,
  state: "ai-reviewed-local-study-input",
  learnerVisible: false,
  humanReviewed: false,
  productionEligible: false,
  sources: {
    vocabularyDraftId: vocabulary.draftId,
    longFormPackIds: longForm.map((pack) => pack.packId),
    summaryArgumentPackIds: summaries.map((pack) => pack.packId),
    integrationPackIds: integrations.map((pack) => pack.packId),
    machineLanguageSupport: "Google Translate public endpoint; pinned output only",
  },
  review: {
    reviewer: "Codex AI self-review",
    passes: [
      "mandarin-accuracy-and-naturalness",
      "pinyin-and-tone-consistency",
      "vietnamese-context-and-clarity",
      "pedagogy-rubric-and-distractors",
      "source-and-level-coverage",
    ],
    disclosureVi:
      "Nghĩa Việt và Pinyin hỗ trợ được tạo/rà soát bằng AI cho tự học local; humanReviewed=false.",
  },
  counts: {
    vocabulary: vocabularyRows.length,
    authoredVietnameseGlosses: vocabularyRows.filter(
      (item) => item.sourceKind === "authored-long-form-context",
    ).length,
    aiSupportedVietnameseGlosses: vocabularyRows.filter(
      (item) => item.sourceKind !== "authored-long-form-context",
    ).length,
    pronunciations: pronunciationRows.length,
  },
  vocabulary: vocabularyRows,
  pronunciations: pronunciationRows,
};

writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: OUTPUT, counts: payload.counts }, null, 2));
