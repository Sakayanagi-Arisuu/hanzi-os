import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { DictionaryExperience } from "./DictionaryExperience";
import {
  getLessonExpansionPack,
  getLessonIdForMegaWord,
  loadMegaLexicon,
  searchMegaVocabularyByHanzi,
  type MegaLexiconArtifact,
  type MegaVocabularyItem,
} from "../content/megaLexicon";
import {
  loadPublishedStudioVocabulary,
  mergePublishedStudioVocabulary,
} from "../content/publishedStudioClient";
import type { DictionaryWord } from "../content/publishedStudioVocabulary";
import {
  LESSON_BY_ID,
  RELEASED_LESSONS,
  RELEASED_VOCABULARY,
} from "../data/curriculum";
import { useLearning } from "../store/LearningStore";
import { useLearningJourney } from "../store/LearningJourneyStore";
import "./DictionaryPage.css";

const normalizeSearch = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

const megaToneNumbers = (word: MegaVocabularyItem) => [...word.pinyinNumbered.matchAll(/[1-5]/gu)]
  .map((match) => Number(match[0]) % 5);

const coreWords: DictionaryWord[] = RELEASED_VOCABULARY.map((word) => ({
  ...word,
  senses: [word.meaning],
  classifiers: [],
  toneNumbers: word.syllables.map((syllable) => syllable.lexicalTone),
  isCore: true,
}));

const megaWordView = (word: MegaVocabularyItem): DictionaryWord => ({
  ...word,
  toneNumbers: megaToneNumbers(word),
  tags: [
    word.editorialDepth === "curated" ? "Chuyên đề biên tập sâu" : "Kho tham chiếu mở rộng",
    word.referenceLevel === "mở rộng" ? "Trung văn hiện đại" : `Mốc ${word.referenceLevel}`,
  ],
  isCore: false,
});

export function DictionaryPage() {
  const location = useLocation();
  const requested = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedLessonId = requested.get("lesson");
  const requestedQuery = requested.get("q") ?? "";
  const journeyChallenge = requested.get("challenge") === "1";
  const { state } = useLearning();
  const { checkpoint, recordReceipt } = useLearningJourney();
  const challengedWordIdsRef = useRef(new Set<string>());
  const [artifact, setArtifact] = useState<MegaLexiconArtifact | null>(null);
  const [publishedVocabulary, setPublishedVocabulary] = useState<DictionaryWord[]>([]);
  const [publishedVocabularyState, setPublishedVocabularyState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [showPublishedVocabularyLoading, setShowPublishedVocabularyLoading] = useState(false);
  const [deepLookupWords, setDeepLookupWords] = useState<DictionaryWord[]>([]);
  const [deepLookupPending, setDeepLookupPending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState(requestedQuery);
  const [lessonScope, setLessonScope] = useState(Boolean(requestedLessonId));
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(coreWords[0]?.id ?? "");

  useEffect(() => {
    let active = true;
    loadMegaLexicon()
      .then((value) => { if (active) setArtifact(value); })
      .catch((reason: unknown) => { if (active) setLoadError(reason instanceof Error ? reason.message : "Không thể tải kho mở rộng."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadingTimer = window.setTimeout(() => setShowPublishedVocabularyLoading(true), 350);
    loadPublishedStudioVocabulary(fetch, controller.signal)
      .then((words) => {
        window.clearTimeout(loadingTimer);
        setShowPublishedVocabularyLoading(false);
        setPublishedVocabulary(words);
        setPublishedVocabularyState("ready");
      })
      .catch(() => {
        window.clearTimeout(loadingTimer);
        if (controller.signal.aborted) return;
        setShowPublishedVocabularyLoading(false);
        setPublishedVocabulary([]);
        setPublishedVocabularyState("unavailable");
      });
    return () => {
      window.clearTimeout(loadingTimer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!/\p{Script=Han}/u.test(query.trim())) {
      setDeepLookupWords([]);
      setDeepLookupPending(false);
      return () => { active = false; };
    }
    setDeepLookupPending(true);
    searchMegaVocabularyByHanzi(query)
      .then((words) => {
        if (active) setDeepLookupWords(words.map(megaWordView));
      })
      .catch(() => {
        if (active) setDeepLookupWords([]);
      })
      .finally(() => {
        if (active) setDeepLookupPending(false);
      });
    return () => { active = false; };
  }, [query]);
  useEffect(() => {
    setQuery(requestedQuery);
    setLessonScope(Boolean(requestedLessonId));
  }, [requestedLessonId, requestedQuery]);

  const baseWords = useMemo(() => {
    const base = artifact ? [...coreWords, ...artifact.vocabulary.map(megaWordView)] : coreWords;
    return mergePublishedStudioVocabulary(base, publishedVocabulary);
  }, [artifact, publishedVocabulary]);
  const allWords = useMemo(() => {
    const surfaces = new Set(baseWords.map((word) => word.simplified));
    return [...baseWords, ...deepLookupWords.filter((word) => !surfaces.has(word.simplified))];
  }, [baseWords, deepLookupWords]);
  const requestedLesson = requestedLessonId ? LESSON_BY_ID.get(requestedLessonId) ?? null : null;
  const lessonWordIds = useMemo(() => {
    if (!requestedLesson) return null;
    const packIds = artifact
      ? getLessonExpansionPack(artifact, requestedLesson.id)?.wordIds ?? []
      : [];
    const studioIds = publishedVocabulary
      .filter((word) => word.sourceLessonIds?.includes(requestedLesson.id))
      .map((word) => word.id);
    return new Set([...requestedLesson.wordIds, ...packIds, ...studioIds]);
  }, [artifact, publishedVocabulary, requestedLesson]);
  const results = useMemo(() => {
    const normalized = normalizeSearch(query);
    return allWords.filter((word) => {
      if (lessonScope && lessonWordIds && !lessonWordIds.has(word.id)) return false;
      if (savedOnly && (!word.isCore || !state.savedWords.includes(word.id))) return false;
      if (!normalized) return true;
      const haystack = [word.simplified, word.traditional, word.pinyin, word.pinyinNumbered, word.meaning, ...word.tags].join(" ");
      return normalizeSearch(haystack).includes(normalized);
    });
  }, [allWords, lessonScope, lessonWordIds, query, savedOnly, state.savedWords]);
  const selected = (requested.get("view") === "detail" ? allWords : results).find((word) => word.id === requested.get("word") || word.sourceStableKey === requested.get("word"))
    ?? results.find((word) => word.id === selectedId) ?? results[0];
  const selectResult = (wordId: string) => {
    setSelectedId(wordId);
    if (!journeyChallenge || !requestedLessonId || !checkpoint) return;
    challengedWordIdsRef.current.add(wordId);
    if (challengedWordIdsRef.current.size < 3) return;
    recordReceipt({
      stage: "transfer",
      source: "dictionary",
      lessonId: requestedLessonId,
      activityId: `dictionary:${checkpoint.journeyId}:three-distinct-entries`,
    });
  };
  const coreLessonByWordId = useMemo(() => {
    const map = new Map<string, string>();
    for (const lesson of RELEASED_LESSONS) for (const wordId of lesson.wordIds) if (!map.has(wordId)) map.set(wordId, lesson.id);
    return map;
  }, []);
  const selectedPathLessonId = selected
    ? selected.isCore
      ? requestedLesson?.wordIds.includes(selected.id) ? requestedLesson.id : coreLessonByWordId.get(selected.id) ?? null
      : selected.sourceLessonIds?.[0] ?? (artifact ? getLessonIdForMegaWord(artifact, selected.id) : null)
    : null;
  const relatedWords = useMemo(() => {
    if (!selected) return [];
    const characters = new Set([...selected.simplified]);
    return allWords
      .filter((word) => word.simplified !== selected.simplified && [...word.simplified].some((character) => characters.has(character)))
      .sort((left, right) => Number(right.isCore) - Number(left.isCore) || left.simplified.length - right.simplified.length)
      .filter((word, index, candidates) => candidates.findIndex(candidate => candidate.simplified === word.simplified) === index)
      .slice(0, 8);
  }, [allWords, selected]);

  return <DictionaryExperience words={allWords} results={results} selected={selected} related={relatedWords} lessonId={selectedPathLessonId} query={query} setQuery={setQuery} select={selectResult} setSavedOnly={setSavedOnly} status={loadError ? "Kho cốt lõi vẫn dùng được; kho mở rộng chưa tải được." : publishedVocabularyState === "unavailable" ? "Mục từ mới tạm gián đoạn; kho hiện tại vẫn dùng được." : deepLookupPending ? "Đang tra mục từ…" : publishedVocabularyState === "loading" && showPublishedVocabularyLoading ? "Đang tải mục từ mới…" : ""} />;
}
