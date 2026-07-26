import {
  Bookmark,
  BookmarkCheck,
  Box,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Layers3,
  PenTool,
  ScanLine,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { HanziCanvas } from "../components/HanziCanvas";
import { CONTENT_VERSION, RELEASED_VOCABULARY } from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";

const characterNotes: Record<string, { radical: string; structure: string; mnemonic: string }> = {
  你: { radical: "亻 · người", structure: "trái - phải", mnemonic: "Một người đứng bên trái, phía phải gợi âm nǐ." },
  好: { radical: "女 · nữ", structure: "trái - phải", mnemonic: "Nữ 女 và con 子 kết hợp thành ý tốt đẹp." },
  我: { radical: "戈 · qua", structure: "đơn thể", mnemonic: "Nhìn phần móc và nét xiên như một dấu hiệu tự nhận diện." },
  是: { radical: "日 · mặt trời", structure: "trên - dưới", mnemonic: "Ánh sáng ở trên, bước chân xác nhận điều đúng ở dưới." },
  人: { radical: "人 · người", structure: "đơn thể", mnemonic: "Hai nét tựa vào nhau như dáng một người đang bước." },
  家: { radical: "宀 · mái nhà", structure: "trên - dưới", mnemonic: "Dưới mái 宀 là nơi gia đình cùng sinh sống." },
  书: { radical: "乛", structure: "đơn thể", mnemonic: "Các nét gấp gọn như những trang sách được đóng lại." },
};

export function CharactersPage() {
  const { state, actions } = useLearning();
  const characterWords = useMemo(() => {
    const seen = new Set<string>();
    return RELEASED_VOCABULARY.filter((word) => {
      const character = (state.profile.script === "traditional" ? word.traditional : word.simplified)[0];
      if (seen.has(character)) return false;
      seen.add(character);
      return true;
    });
  }, [state.profile.script]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const word = characterWords[selectedIndex];
  if (!word) {
    return (
      <div className="lesson-state-screen">
        <PenTool size={44} />
        <h1>Chưa có dữ liệu Hán tự đã phát hành</h1>
        <p>Nội dung luyện nét sẽ xuất hiện sau khi vượt cổng biên tập.</p>
      </div>
    );
  }
  const fullWord = state.profile.script === "traditional" ? word.traditional : word.simplified;
  const character = fullWord[0];
  const note = characterNotes[character] ?? {
    radical: "Đang phân tích",
    structure: fullWord.length > 1 ? "cụm nhiều chữ" : "đơn thể",
    mnemonic: `Liên kết hình dạng ${character} với âm ${word.pinyin} và nghĩa “${word.meaning}”.`,
  };
  const saved = state.savedWords.includes(word.id);

  const recordWritingEvidence = ({
    mistakes,
    durationMs,
    usedHint,
  }: {
    mistakes: number;
    durationMs: number;
    usedHint: boolean;
  }) => {
    const score = Math.max(0, 100 - mistakes * 12);
    actions.recordPracticeEvidence({
      idempotencyKey: makeIdempotencyKey(`stroke-quiz:${word.id}:${character}`),
      activityVersion: `${CONTENT_VERSION}:hanzi-writer:1`,
      source: "writing",
      method: "stroke-quiz",
      activityId: `stroke-quiz:${word.id}:${character}`,
      skill: "writing",
      outcome: score >= 70 ? "correct" : "incorrect",
      score,
      metadata: {
        character,
        mistakes,
        durationMs,
        usedHint,
        priorExposure: state.evidence.some((item) =>
          item.activityId === `stroke-quiz:${word.id}:${character}`
        ),
      },
    });
  };

  const move = (direction: number) => {
    setSelectedIndex((current) => (current + direction + characterWords.length) % characterWords.length);
  };

  return (
    <div className="content-page characters-page">
      <header className="page-hero glyph-hero">
        <div>
          <span className="system-kicker"><PenTool size={15} /> GLYPH FORGE · STROKE ENGINE</span>
          <h1>Thần Văn Lô</h1>
          <p>Tách cấu trúc, quan sát thứ tự nét rồi viết lại bằng tay ngay trên lưới.</p>
        </div>
        <div className="glyph-hero-mark" aria-hidden="true"><b>永</b><span /></div>
      </header>

      <div className="character-layout">
        <aside className="character-index">
          <header className="section-heading">
            <div><span>GLYPH INDEX</span><h2>Kho chữ đang phát hành</h2></div>
            <Grid3X3 size={20} />
          </header>
          <div className="character-search-status"><ScanLine size={15} /> {characterWords.length} chữ đã nạp</div>
          <div className="character-list">
            {characterWords.map((item, index) => {
              const itemCharacter = (state.profile.script === "traditional" ? item.traditional : item.simplified)[0];
              return (
                <button className={selectedIndex === index ? "active" : ""} key={item.id} type="button" onClick={() => setSelectedIndex(index)}>
                  <strong>{itemCharacter}</strong>
                  <span><b>{item.pinyin}</b><small>{item.meaning}</small></span>
                  {state.savedWords.includes(item.id) && <BookmarkCheck size={15} />}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="character-forge">
          <div className="forge-toolbar">
            <button className="icon-button" type="button" onClick={() => move(-1)} aria-label="Chữ trước"><ChevronLeft size={20} /></button>
            <span>GLYPH {String(selectedIndex + 1).padStart(2, "0")} / {String(characterWords.length).padStart(2, "0")}</span>
            <button className="icon-button" type="button" onClick={() => move(1)} aria-label="Chữ sau"><ChevronRight size={20} /></button>
          </div>
          <div className="forge-workbench">
            <HanziCanvas character={character} onQuizComplete={recordWritingEvidence} />
            <div className="character-dossier">
              <div className="character-title">
                <span>{character}</span>
                <div><small>ÂM · NGHĨA</small><h2>{word.pinyin}</h2><p>{word.meaning}</p></div>
                <button className="icon-button" type="button" onClick={() => speakMandarin(fullWord)} aria-label={`Nghe ${fullWord}`}><Volume2 size={20} /></button>
              </div>
              <dl>
                <div><dt><Box size={15} /> Bộ/thành phần</dt><dd>{note.radical}</dd></div>
                <div><dt><Layers3 size={15} /> Kết cấu</dt><dd>{note.structure}</dd></div>
                <div><dt><Sparkles size={15} /> Móc ghi nhớ</dt><dd>{note.mnemonic}</dd></div>
              </dl>
              <div className="glyph-example">
                <small>NGỮ CẢNH KÍCH HOẠT</small>
                <strong>{word.example}</strong>
                <span>{word.examplePinyin}</span>
                <p>{word.exampleMeaning}</p>
              </div>
              <button className={`save-word-button ${saved ? "saved" : ""}`} type="button" onClick={() => actions.toggleSavedWord(word.id)}>
                {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                {saved ? "Đã lưu vào ký ức" : "Lưu vào bộ ôn FSRS"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
