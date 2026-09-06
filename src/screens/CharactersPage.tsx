import {
  BookmarkCheck,
  ChevronRight,
  Clock3,
  Flame,
  Layers3,
  PenTool,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  createCharacterForgeSession,
  getUniqueReleasedCharacterEntries,
  parseCharacterForgeSession,
  serializeCharacterForgeSession,
  type CharacterForgeSource,
} from "../characters/characterForgeSession";
import { mergePublishedStudioCharacters } from "../content/publishedStudioClient";
import { usePublishedStudioCharacters } from "../content/usePublishedStudioCharacters";
import { LESSON_BY_ID, RELEASED_VOCABULARY, RELEASED_WORD_BY_ID } from "../data/curriculum";
import {
  RELEASED_CHARACTER_PRACTICE,
  type ReleasedCharacterPracticeEntry,
} from "../learning/richLessonContent";
import {
  CHARACTER_FORGE_SESSION_STORAGE_KEY,
  getCharacterForgeSessionStorageKey,
  readLocalStorage,
  writeLocalStorage,
} from "../lib/storageKeys";
import { stripPinyinMarks } from "../lib/pinyin";
import { useLearning } from "../store/LearningStore";
import "./CharactersPage.css";

const levels = ["all", "hsk0", "hsk1", "hsk2", "hsk3", "hsk4"] as const;
type CharacterLevel = typeof levels[number];

const levelLabel = (level: CharacterLevel) => level === "all" ? "Tất cả" : level.toUpperCase();

export const UNIQUE_RELEASED_CHARACTERS = getUniqueReleasedCharacterEntries(RELEASED_CHARACTER_PRACTICE);

const vocabularyBySimplified = new Map(RELEASED_VOCABULARY.map((word) => [word.simplified, word]));

export const getCharacterScriptPresentation = (
  item: ReleasedCharacterPracticeEntry,
  script: "simplified" | "traditional",
) => {
  const word = vocabularyBySimplified.get(item.contextWord);
  if (script !== "traditional" || !word) return {
    displayHanzi: item.hanzi,
    displayContextWord: item.contextWord,
    paired: false,
  };
  const simplifiedCharacters = [...word.simplified];
  const traditionalCharacters = [...word.traditional];
  const characterIndex = simplifiedCharacters.indexOf(item.hanzi);
  return {
    displayHanzi: characterIndex >= 0 && simplifiedCharacters.length === traditionalCharacters.length
      ? traditionalCharacters[characterIndex] ?? item.hanzi
      : item.hanzi,
    displayContextWord: word.traditional,
    paired: word.traditional !== word.simplified,
  };
};

export const characterEntryMatchesQuery = (
  item: ReleasedCharacterPracticeEntry,
  query: string,
) => {
  const normalized = query.trim().toLocaleLowerCase("vi");
  if (!normalized) return true;
  const pinyinQuery = stripPinyinMarks(normalized);
  return [
    item.hanzi,
    item.contextWord,
    vocabularyBySimplified.get(item.contextWord)?.traditional ?? "",
    item.meaningVi,
    item.contextMeaningVi,
  ].some((value) => value.toLocaleLowerCase("vi").includes(normalized))
    || Boolean(pinyinQuery && [item.pinyin, item.contextPinyin].some((value) =>
      stripPinyinMarks(value).includes(pinyinQuery)
    ));
};

export const legacyCharacterRequestToSession = ({
  character,
  lessonId,
  entries = RELEASED_CHARACTER_PRACTICE,
}: {
  character: string;
  lessonId: string | null;
  entries?: readonly ReleasedCharacterPracticeEntry[];
}) => createCharacterForgeSession({
  entries,
  lessonId,
  requestedHanzis: [character],
  source: "legacy",
  limit: lessonId ? 5 : 1,
});

export function CharactersPage() {
  const { state, sync } = useLearning();
  const location = useLocation();
  const navigate = useNavigate();
  const publishedCharacters = usePublishedStudioCharacters();
  const characterEntries = useMemo(() => mergePublishedStudioCharacters(
    RELEASED_CHARACTER_PRACTICE,
    publishedCharacters.entries,
  ), [publishedCharacters.entries]);
  const uniqueCharacters = useMemo(
    () => getUniqueReleasedCharacterEntries(characterEntries),
    [characterEntries],
  );
  const requested = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedCharacter = requested.get("char") ?? "";
  const requestedLessonId = requested.get("lesson");
  const requestedLesson = requestedLessonId ? LESSON_BY_ID.get(requestedLessonId) ?? null : null;
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<CharacterLevel>("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedHanzis, setSelectedHanzis] = useState<string[]>([]);
  const forgeStorageKey = getCharacterForgeSessionStorageKey(sync.ownerKey);
  const [resume, setResume] = useState(() => parseCharacterForgeSession(
    readLocalStorage(forgeStorageKey)
      ?? (sync.ownerKey.startsWith("anonymous:")
        ? readLocalStorage(CHARACTER_FORGE_SESSION_STORAGE_KEY)
        : null),
  ));

  useEffect(() => {
    setResume(parseCharacterForgeSession(
      readLocalStorage(forgeStorageKey)
        ?? (sync.ownerKey.startsWith("anonymous:")
          ? readLocalStorage(CHARACTER_FORGE_SESSION_STORAGE_KEY)
          : null),
    ));
  }, [forgeStorageKey, sync.ownerKey]);

  const counts = useMemo(() => Object.fromEntries(levels.map((item) => [
    item,
    item === "all"
      ? uniqueCharacters.length
      : uniqueCharacters.filter((entry) => entry.level === item).length,
  ])) as Record<CharacterLevel, number>, [uniqueCharacters]);
  const filtered = useMemo(() => uniqueCharacters.filter((entry) =>
    (level === "all" || entry.level === level)
    && characterEntryMatchesQuery(entry, query)
  ), [level, query, uniqueCharacters]);
  const lessonEntries = useMemo(() => requestedLessonId
    ? (() => {
        const direct = getUniqueReleasedCharacterEntries(characterEntries.filter((entry) => entry.lessonId === requestedLessonId));
        if (direct.length || !requestedLesson) return direct;
        const lessonHanzis = new Set(requestedLesson.wordIds.flatMap((wordId) => [...(RELEASED_WORD_BY_ID.get(wordId)?.simplified ?? "")]));
        return uniqueCharacters.filter((entry) => lessonHanzis.has(entry.hanzi));
      })()
    : [], [characterEntries, requestedLesson, requestedLessonId, uniqueCharacters]);

  const troubledHanzis = useMemo(() => {
    const evidence = new Set<string>();
    for (const mistake of state.mistakes.filter((item) => !item.resolved)) {
      const word = mistake.wordId ? RELEASED_WORD_BY_ID.get(mistake.wordId)?.simplified : null;
      const haystack = `${word ?? ""}${mistake.prompt}${mistake.correctAnswer}`;
      uniqueCharacters.forEach((entry) => {
        if (haystack.includes(entry.hanzi)) evidence.add(entry.hanzi);
      });
    }
    for (const wordId of state.savedWords) {
      const word = RELEASED_WORD_BY_ID.get(wordId)?.simplified;
      if (!word) continue;
      uniqueCharacters.forEach((entry) => {
        if (word.includes(entry.hanzi)) evidence.add(entry.hanzi);
      });
    }
    return [...evidence].slice(0, 5);
  }, [state.mistakes, state.savedWords, uniqueCharacters]);

  useEffect(() => {
    if (!requestedCharacter) return;
    const legacySession = legacyCharacterRequestToSession({
      character: requestedCharacter,
      lessonId: requestedLesson?.id ?? null,
      entries: characterEntries,
    });
    if (!legacySession) return;
    writeLocalStorage(forgeStorageKey, serializeCharacterForgeSession(legacySession));
    navigate(`/characters/session?source=legacy&char=${encodeURIComponent(requestedCharacter)}${requestedLesson ? `&lesson=${encodeURIComponent(requestedLesson.id)}` : ""}`, { replace: true });
  }, [characterEntries, forgeStorageKey, navigate, requestedCharacter, requestedLesson]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickerOpen]);

  const startSession = ({
    source,
    lessonId = null,
    requestedHanzis = [],
    limit = 4,
  }: {
    source: CharacterForgeSource;
    lessonId?: string | null;
    requestedHanzis?: readonly string[];
    limit?: number;
  }) => {
    const session = createCharacterForgeSession({
      entries: characterEntries,
      source,
      lessonId,
      requestedHanzis,
      limit,
      offset: new Date().getDate(),
    });
    if (!session) return;
    writeLocalStorage(forgeStorageKey, serializeCharacterForgeSession(session));
    setResume(session);
    navigate(`/characters/session?source=${source}${lessonId ? `&lesson=${encodeURIComponent(lessonId)}` : ""}`);
  };

  const hasActiveResume = Boolean(resume && resume.phase !== "result");
  const primary = requestedLesson && lessonEntries.length
    ? {
        label: `Tiếp tục từ “${requestedLesson.title}”`,
        detail: `${lessonEntries.length} chữ trong đúng ngữ cảnh bài`,
        action: () => startSession({ source: "lesson", lessonId: requestedLesson.id, requestedHanzis: lessonEntries.map((entry) => entry.hanzi), limit: 5 }),
      }
    : hasActiveResume && resume
      ? {
          label: "Tiếp tục phiên đang dở",
          detail: `Chữ ${resume.currentIndex + 1}/${resume.hanzis.length} · tiến độ đã lưu trên thiết bị`,
          action: () => navigate("/characters/session?resume=1"),
        }
      : {
          label: "Tôi luyện nhanh 4 chữ",
          detail: "Một vòng ngắn: nhìn cấu trúc, dự đoán nét, viết và kích hoạt",
          action: () => startSession({ source: "quick", limit: 4 }),
        };

  return (
    <div className="forge-lobby">
      <section className="forge-lobby-hero" aria-labelledby="forge-lobby-title">
        <div className="forge-lobby-copy">
          <span className="forge-kicker"><PenTool /> THẦN VĂN LÔ · LÒ TÔI LUYỆN HÌNH THỂ</span>
          <h1 id="forge-lobby-title">Hiểu cấu trúc. Viết từ trí nhớ.</h1>
          <p>Một phiên ngắn giúp bạn nhìn rõ từng phần, đoán hướng nét và dùng lại chữ trong từ thật.</p>
          <button className="forge-primary-summon" type="button" onClick={primary.action}>
            <span><Sparkles /><strong>{primary.label}</strong><small>{primary.detail}</small></span>
            <ChevronRight />
          </button>
          <div className="forge-lobby-bridges">
            <span><ShieldCheck /> {uniqueCharacters.length.toLocaleString("vi-VN")} chữ có hình học nét đã phát hành</span>
            <Link to="/dictionary">Cần tra một từ? Sang Tàng Tự Khố <ChevronRight /></Link>
          </div>
          {publishedCharacters.status === "fallback" && <p className="forge-runtime-note" role="status">Nội dung biên tập mới chưa tải được; kho chữ cốt lõi vẫn nguyên vẹn. <button type="button" onClick={publishedCharacters.retry}>Thử lại</button></p>}
        </div>
        <div className="forge-core" aria-hidden="true">
          <i className="forge-core-ring is-outer" />
          <i className="forge-core-ring is-middle" />
          <i className="forge-core-ring is-inner" />
          <span>{lessonEntries[0]?.hanzi ?? resume?.hanzis[resume.currentIndex] ?? "文"}</span>
          <b>形</b><b>音</b><b>用</b>
        </div>
      </section>

      <section className="forge-pathways" aria-label="Chọn nguồn phiên tôi luyện">
        <button type="button" onClick={() => startSession({ source: "quick", requestedHanzis: troubledHanzis, limit: Math.max(3, troubledHanzis.length) })} disabled={troubledHanzis.length === 0}>
          <span><Target /></span>
          <div><small>ƯU TIÊN BẰNG CHỨNG</small><strong>Chữ đang vướng</strong><p>{troubledHanzis.length ? `${troubledHanzis.join(" · ")} từ lỗi hoặc mục đã lưu` : "Chưa có lỗi hình thể phù hợp; mục này sẽ mở khi có bằng chứng."}</p></div>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => startSession({ source: "quick", limit: 4 })}>
          <span><Flame /></span>
          <div><small>3–5 CHỮ · KHOẢNG 8 PHÚT</small><strong>Tôi luyện nhanh</strong><p>Hệ thống chọn một vòng gọn từ kho đã phát hành.</p></div>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => setPickerOpen(true)}>
          <span><Layers3 /></span>
          <div><small>TÌM · LỌC · CHỌN TỐI ĐA 5</small><strong>Tự chọn chữ</strong><p>Mở kho chữ trong một bảng chọn riêng, không chen cạnh bàn viết.</p></div>
          <ChevronRight />
        </button>
      </section>

      {(resume || requestedLesson) && (
        <section className="forge-recent-thread" aria-label="Mạch luyện gần đây">
          <div><Clock3 /><span><small>MẠCH GẦN NHẤT</small><strong>{requestedLesson ? requestedLesson.title : "Phiên tự chọn trên thiết bị"}</strong></span></div>
          <div className="forge-mini-glyphs">{(resume?.hanzis ?? lessonEntries.map((entry) => entry.hanzi)).slice(0, 5).map((hanzi) => <span key={hanzi}>{hanzi}</span>)}</div>
          {resume?.phase === "result"
            ? <button type="button" onClick={() => startSession({ source: resume.source, lessonId: resume.lessonId, requestedHanzis: resume.needsReplay.length ? resume.needsReplay : resume.hanzis, limit: Math.max(3, resume.hanzis.length) })}>Luyện lại mạch này</button>
            : resume && <button type="button" onClick={() => navigate("/characters/session?resume=1")}>Tiếp tục</button>}
        </section>
      )}

      {pickerOpen && (
        <div className="forge-picker-scrim" role="presentation" onMouseDown={() => setPickerOpen(false)}>
          <section className="forge-picker" role="dialog" aria-modal="true" aria-labelledby="forge-picker-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><small>TỰ CHỌN PHÔI CHỮ</small><h2 id="forge-picker-title">Chọn 3–5 chữ cho một phiên</h2></div>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="Đóng kho chọn chữ"><X /></button>
            </header>
            <div className="forge-picker-tools">
              <label><Search /><span className="sr-only">Tìm Hán tự</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chữ, pinyin hoặc nghĩa Việt…" /></label>
              <div role="group" aria-label="Lọc cấp HSK">{levels.map((item) => <button key={item} type="button" aria-pressed={level === item} onClick={() => setLevel(item)}>{levelLabel(item)} <small>{counts[item]}</small></button>)}</div>
            </div>
            <div className="forge-picker-grid" aria-label={`${filtered.length} Hán tự phù hợp`}>
              {filtered.slice(0, 240).map((entry) => {
                const presentation = getCharacterScriptPresentation(entry, state.profile.script);
                const selected = selectedHanzis.includes(entry.hanzi);
                return <button key={entry.id} type="button" aria-pressed={selected} disabled={!selected && selectedHanzis.length >= 5} onClick={() => setSelectedHanzis((current) => current.includes(entry.hanzi) ? current.filter((hanzi) => hanzi !== entry.hanzi) : [...current, entry.hanzi])}><strong>{presentation.displayHanzi}</strong><span>{entry.pinyin}</span><small>{entry.meaningVi}</small>{selected && <BookmarkCheck />}</button>;
              })}
            </div>
            <footer>
              <p><strong>{selectedHanzis.length}/5 chữ</strong><span>{selectedHanzis.length < 3 ? `Chọn thêm ${3 - selectedHanzis.length} chữ` : "Phiên đã sẵn sàng"}</span></p>
              <button type="button" disabled={selectedHanzis.length < 3} onClick={() => startSession({ source: "custom", requestedHanzis: selectedHanzis, limit: selectedHanzis.length })}>Khai lò với {selectedHanzis.length} chữ <ChevronRight /></button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
