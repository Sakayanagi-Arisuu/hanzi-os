import {
  BookOpenText,
  ChevronRight,
  Eye,
  EyeOff,
  PenTool,
  Search,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  RELEASED_CHARACTER_PRACTICE,
  type ReleasedCharacterPracticeEntry,
} from "../learning/richLessonContent";
import { stripPinyinMarks } from "../lib/pinyin";
import { speakMandarin } from "../lib/speech";
import "./CharactersPage.css";

const levels = ["all", "hsk1", "hsk2", "hsk3", "hsk4"] as const;
type CharacterLevel = typeof levels[number];

const levelLabel = (level: CharacterLevel) => level === "all"
  ? "Tất cả"
  : level.toUpperCase();

const uniqueCharacters = (() => {
  const seen = new Set<string>();
  return RELEASED_CHARACTER_PRACTICE.filter((item) => {
    if (seen.has(item.hanzi)) return false;
    seen.add(item.hanzi);
    return true;
  });
})();

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
    item.contextMeaningVi,
  ].some((value) => value.toLocaleLowerCase("vi").includes(normalized))
    || Boolean(pinyinQuery && [item.pinyin, item.contextPinyin].some((value) =>
      stripPinyinMarks(value).includes(pinyinQuery)
    ));
};

export function CharactersPage() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<CharacterLevel>("all");
  const [selectedHanzi, setSelectedHanzi] = useState(
    uniqueCharacters[0]?.hanzi ?? "",
  );
  const [revealed, setRevealed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(120);
  const counts = useMemo(() => Object.fromEntries(levels.map((item) => [
    item,
    item === "all"
      ? uniqueCharacters.length
      : uniqueCharacters.filter((character) => character.level === item).length,
  ])) as Record<CharacterLevel, number>, []);
  const filtered = useMemo(() => {
    return uniqueCharacters.filter((item) =>
      (level === "all" || item.level === level)
      && characterEntryMatchesQuery(item, query)
    );
  }, [level, query]);
  const selected = filtered.find((item) => item.hanzi === selectedHanzi)
    ?? filtered[0]
    ?? null;

  const choose = (item: ReleasedCharacterPracticeEntry) => {
    setSelectedHanzi(item.hanzi);
    setRevealed(false);
  };

  return (
    <div className="character-forge-page">
      <header className="character-forge-hero">
        <div>
          <span className="system-kicker"><PenTool size={15} /> THẦN VĂN LÔ · KHO NHẬN DIỆN</span>
          <h1>Nhận diện 1.096 Hán tự trong từ</h1>
          <p>Tìm một chữ, xem chữ ấy trong từ nào, nghe cả từ rồi trở về đúng bài học có ngữ cảnh. Đây là kho nhận diện trong ngữ cảnh, không phải từ điển âm-nghĩa độc lập hay dữ liệu thứ tự nét.</p>
        </div>
        <div className="character-forge-count">
          <strong>{uniqueCharacters.length.toLocaleString("vi-VN")}</strong>
          <span>ký tự có ví dụ từ</span>
        </div>
      </header>

      <section className="character-forge-toolbar" aria-label="Lọc kho Hán tự">
        <label>
          <Search size={18} />
          <span className="sr-only">Tìm Hán tự</span>
          <input
            value={query}
            placeholder="Tìm chữ, pinyin hoặc nghĩa Việt..."
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(120);
            }}
          />
        </label>
        <div role="group" aria-label="Cấp độ HSK">
          {levels.map((item) => (
            <button
              className={level === item ? "active" : ""}
              key={item}
              type="button"
              aria-pressed={level === item}
              onClick={() => {
                setLevel(item);
                setVisibleCount(120);
              }}
            >
              {levelLabel(item)} <small>{counts[item]}</small>
            </button>
          ))}
        </div>
        <p className="character-level-note">Mỗi cấp ghi lần đầu chữ xuất hiện trong lộ trình; không phải tổng tích lũy của cấp.</p>
      </section>

      <div className="character-forge-layout">
        <section
          className="character-glyph-grid"
          aria-label={`${filtered.length} Hán tự phù hợp`}
        >
          {filtered.slice(0, visibleCount).map((item) => (
            <button
              className={selected?.hanzi === item.hanzi ? "active" : ""}
              key={`${item.level}:${item.hanzi}`}
              type="button"
              onClick={() => choose(item)}
              aria-label={`Chữ ${item.hanzi} trong từ ${item.contextWord}, ${item.contextPinyin}`}
              aria-pressed={selected?.hanzi === item.hanzi}
            >
              <strong>{item.hanzi}</strong><small>{item.contextWord}</small>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="character-empty">Không tìm thấy chữ phù hợp.</p>
          )}
          {visibleCount < filtered.length && (
            <button
              className="character-load-more"
              type="button"
              onClick={() => setVisibleCount((count) => count + 120)}
            >
              Xem thêm {Math.min(120, filtered.length - visibleCount)} chữ
            </button>
          )}
        </section>

        <aside className="character-focus-card">
          {selected ? (
            <>
              <div className="character-focus-live" aria-live="polite">
                <span>{selected.level.toUpperCase()} · NHẬN DIỆN TRONG NGỮ CẢNH</span>
                <div className="character-main-glyph">{selected.hanzi}</div>
                {revealed ? (
                  <div className="character-reveal">
                    <strong>Chữ {selected.hanzi} trong từ</strong>
                    <h2>{selected.contextWord}</h2>
                    <p>{selected.contextPinyin}</p>
                    <small>{selected.contextMeaningVi}</small>
                  </div>
                ) : (
                  <div className="character-recall-prompt">
                    <EyeOff size={22} />
                    <strong>Tự nhớ từ chứa chữ này trước khi lật thẻ</strong>
                    <small>Không ghi bằng chứng thành thạo ở lượt tự kiểm này.</small>
                  </div>
                )}
              </div>
              <button
                className="character-sound"
                type="button"
                onClick={() => speakMandarin(selected.contextWord)}
                aria-label={`Nghe từ ${selected.contextWord}`}
              >
                <Volume2 size={20} />
              </button>
              <div className="character-focus-actions">
                <button type="button" onClick={() => setRevealed((value) => !value)}>
                  {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
                  {revealed ? "Ẩn để tự kiểm" : "Hiện từ và nghĩa"}
                </button>
                <Link to={`/lesson/${encodeURIComponent(selected.lessonId)}`}>
                  <BookOpenText size={17} /> Học trong bài <ChevronRight size={16} />
                </Link>
              </div>
              <p className="character-provenance-note">
                <ShieldCheck size={15} /> Luyện thứ tự nét sẽ mở riêng khi dữ liệu nét vượt cổng nguồn và bản quyền.
              </p>
            </>
          ) : (
            <div className="character-focus-empty" role="status">
              <Search size={24} />
              <strong>Không có mục để hiển thị</strong>
              <small>Đổi từ khóa hoặc cấp HSK để tiếp tục.</small>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
