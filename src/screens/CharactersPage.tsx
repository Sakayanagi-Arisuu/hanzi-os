import {
  BookmarkCheck,
  BookOpenText,
  Compass,
  ChevronRight,
  PenTool,
  Search,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuildGlyph } from "../components/GuildGlyph";
import { GuildBanner } from "../components/GuildBanner";
import { useLocation, useNavigate } from "react-router";
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
import "./GlyphGuild.css";
import "./GuildReference.css";
import { GuildJourney } from "../components/GuildJourney";
import { loadHanziStrokeData } from "../characters/hanziStrokeData";

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
  const pickerOpen = requested.get("view") === "picker";
  const setPickerOpen = useCallback((open: boolean) => {
    const params = new URLSearchParams(location.search);
    if (open) params.set("view", "picker");
    else params.delete("view");
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.pathname, location.search, navigate]);
  const [pickerPage, setPickerPage] = useState(0);
  const pickerGrid = useRef<HTMLDivElement>(null);
  const [pickerCapacity, setPickerCapacity] = useState({ size: 12, rows: 2 });
  useEffect(() => {
    const grid = pickerGrid.current;
    if (!pickerOpen || !grid) return;
    const observer = new ResizeObserver(() => {
      const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      const rows = Math.max(1, Math.min(2, Math.floor((grid.clientHeight - 24) / 235)));
      setPickerCapacity((previous) => previous.size === columns * rows && previous.rows === rows
        ? previous : { size: columns * rows, rows });
    });
    observer.observe(grid);
    return () => observer.disconnect();
  }, [pickerOpen]);
  const [missionStrokeCount, setMissionStrokeCount] = useState<number | null>(null);
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
  }, [pickerOpen, setPickerOpen]);

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

  const missionEntry = lessonEntries[0]
    ?? uniqueCharacters.find((entry) => entry.hanzi === resume?.hanzis[resume.currentIndex])
    ?? uniqueCharacters.find((entry) => entry.hanzi === "好")
    ?? uniqueCharacters[0];
  useEffect(() => {
    let active = true;
    setMissionStrokeCount(null);
    if (missionEntry) void loadHanziStrokeData(missionEntry.hanzi)
      .then((data) => { if (active) setMissionStrokeCount(data.strokes.length); })
      .catch(() => { if (active) setMissionStrokeCount(null); });
    return () => { active = false; };
  }, [missionEntry]);
  const hasActiveResume = Boolean(resume && resume.phase !== "result");
  const previewEntry = uniqueCharacters.find((entry) => entry.hanzi === selectedHanzis.at(-1)) ?? missionEntry;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pickerCapacity.size));
  const visiblePage = Math.min(pickerPage, pageCount - 1);
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
          label: "Bắt đầu Nhìn Xuyên",
          detail: "Một vòng ngắn: nhìn cấu trúc, dự đoán nét, viết và kích hoạt",
          action: () => startSession({ source: "quick", requestedHanzis: missionEntry ? [missionEntry.hanzi] : [], limit: 1 }),
        };

  return (
    <div className="forge-lobby guild-theme" data-picker-open={pickerOpen}>
      <section className="guild-lobby-board" aria-labelledby="forge-lobby-title">
        <GuildBanner />
        <div className="guild-lobby-main">
          <span className="forge-kicker"><Compass size={19} /> THẦN VĂN LÔ</span>
          <h1 id="forge-lobby-title">Sảnh Luyện Chữ</h1>
          <div className="guild-mission-layout">
            <div className="guild-glyph-orbit" aria-hidden="true"><GuildGlyph hanzi={missionEntry?.hanzi ?? "文"} /></div>
            <div className="guild-mission-copy">
              <span><Compass size={18} /> Nhiệm vụ hiện tại</span>
              <div><strong lang="zh-Hans">{missionEntry?.hanzi}</strong><p>{missionEntry?.pinyin}<small>{missionEntry?.meaningVi}</small></p></div>
              <span className="guild-proof"><ShieldCheck size={18} /> {missionStrokeCount ? "Dữ liệu nét đã tải và kiểm tra" : "Đang kiểm tra dữ liệu nét"}</span>
              <p>Nhìn cấu trúc, đoán nét, viết theo mẫu rồi tự viết trong ngữ cảnh.</p>
            </div>
            <aside className="guild-evidence guild-panel">
              <h2>CHỨNG CỨ HÀNH TRÌNH</h2>
              <p><BookOpenText /><span>Trong từ <strong lang="zh-Hans">{missionEntry?.contextWord}</strong></span></p>
              <p><PenTool /><span>{missionStrokeCount ?? "—"} nét</span></p>
              <p><Target /><span>Mục tiêu: nhớ cấu trúc và thứ tự nét</span></p>
            </aside>
          </div>
          <section className="guild-journey-panel guild-panel"><h2>HÀNH TRÌNH LUYỆN CHỮ</h2><GuildJourney /></section>
          <div className="guild-lobby-actions">
            <button className="guild-primary" type="button" onClick={primary.action}><Compass /><span>{primary.label}</span><ChevronRight /></button>
            <button className="guild-secondary" type="button" onClick={() => setPickerOpen(true)}><Target /> Chọn chữ khác</button>
          </div>
          <p className="guild-disclosure"><ShieldCheck size={18} /> Chỉ mở luyện viết khi có dữ liệu thứ tự nét từ nguồn đã ghim.</p>
          {publishedCharacters.status === "fallback" && <p role="status">Kho chữ cốt lõi vẫn dùng được. <button type="button" onClick={publishedCharacters.retry}>Tải lại nội dung biên tập</button></p>}
        </div>
      </section>

      {pickerOpen && (
        <div className="forge-picker-scrim">
          <section className="forge-picker" aria-labelledby="forge-picker-title">
            <header>
              <div><small>CÔNG HỘI · CHỌN NHIỆM VỤ</small><h2 id="forge-picker-title">Kho Chọn Chữ</h2></div>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="Đóng kho chọn chữ"><X /></button>
            </header>
            <div className="forge-picker-tools">
              <label><Search /><span className="sr-only">Tìm Hán tự</span><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setPickerPage(0); }} placeholder="Tìm chữ, pinyin hoặc nghĩa Việt…" /></label>
              <div role="group" aria-label="Lọc cấp HSK">{levels.map((item) => <button key={item} type="button" aria-pressed={level === item} onClick={() => { setLevel(item); setPickerPage(0); }}>{levelLabel(item)} <small>{counts[item]}</small></button>)}</div>
              <select className="guild-level-select" aria-label="Lọc cấp HSK" value={level} onChange={(event) => { setLevel(event.target.value as CharacterLevel); setPickerPage(0); }}>{levels.map((item) => <option key={item} value={item}>{levelLabel(item)} · {counts[item]} chữ</option>)}</select>
            </div>
            <div className="guild-picker-workspace">
            <div ref={pickerGrid} className="forge-picker-grid" style={{ gridTemplateRows: `repeat(${pickerCapacity.rows}, minmax(0, 1fr))` }} aria-label={`${filtered.length} Hán tự phù hợp`}>
              {filtered.slice(visiblePage * pickerCapacity.size, (visiblePage + 1) * pickerCapacity.size).map((entry) => {
                const presentation = getCharacterScriptPresentation(entry, state.profile.script);
                const selected = selectedHanzis.includes(entry.hanzi);
                return <button key={entry.id} type="button" aria-label={`${presentation.displayHanzi} · ${entry.pinyin} · ${entry.meaningVi}`} aria-pressed={selected} disabled={!selected && selectedHanzis.length >= 5} onClick={() => setSelectedHanzis((current) => current.includes(entry.hanzi) ? current.filter((hanzi) => hanzi !== entry.hanzi) : [...current, entry.hanzi])}><strong className="guild-card-character">{presentation.displayHanzi === entry.hanzi ? <GuildGlyph hanzi={entry.hanzi} /> : presentation.displayHanzi}</strong><span>{entry.pinyin}</span><small>{entry.meaningVi}</small><span className="guild-card-context">Trong từ · {presentation.displayContextWord}</span><span className="guild-card-status">{selected ? "ĐÃ CHỌN" : levelLabel(entry.level as CharacterLevel)}</span>{selected && <BookmarkCheck />}</button>;
              })}
              {filtered.length === 0 && <p className="guild-picker-empty" role="status">Không tìm thấy chữ phù hợp. Thử pinyin hoặc bỏ bộ lọc HSK.</p>}
            </div>
            <aside className="guild-picker-preview guild-panel" aria-label="Chữ đã chọn">
              <h3>{selectedHanzis.length ? "Nhiệm vụ đã chọn" : "Nhiệm vụ hiện tại"}</h3>
              {previewEntry && <>
                <p className="guild-preview-context"><BookOpenText size={18} /> Trong từ <strong lang="zh-Hans">{previewEntry.contextWord}</strong></p>
                <div className="guild-glyph-orbit"><GuildGlyph hanzi={previewEntry.hanzi} /></div>
                <p className="guild-preview-pinyin">{previewEntry.pinyin}</p>
                <strong>{previewEntry.meaningVi}</strong>
                <p>{previewEntry.contextWord} · {previewEntry.contextMeaningVi}</p>
                <p className="guild-preview-selection">{selectedHanzis.length ? selectedHanzis.join(" · ") : "Chọn 1–5 chữ để tạo một mạch luyện."}</p>
              </>}
            </aside>
            </div>
            <footer>
              <p><strong>{selectedHanzis.length}/5 chữ</strong><span>{selectedHanzis.length < 1 ? "Chọn ít nhất một chữ" : "Phiên đã sẵn sàng"}</span></p>
              <nav className="guild-picker-pagination" aria-label="Trang kho chữ"><button type="button" aria-label="Trang trước" disabled={visiblePage === 0} onClick={() => setPickerPage(visiblePage - 1)}>‹</button><span aria-live="polite">{visiblePage + 1}/{pageCount}</span><button type="button" aria-label="Trang sau" disabled={visiblePage + 1 >= pageCount} onClick={() => setPickerPage(visiblePage + 1)}>›</button></nav>
              <button type="button" disabled={selectedHanzis.length < 1} onClick={() => startSession({ source: "custom", requestedHanzis: selectedHanzis, limit: selectedHanzis.length })}>Luyện {selectedHanzis.length} chữ <ChevronRight /></button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
