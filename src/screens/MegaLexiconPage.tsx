import {
  ArrowLeft,
  BookOpenCheck,
  ChevronRight,
  Database,
  Headphones,
  Layers3,
  LibraryBig,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  loadMegaLexicon,
  MEGA_LEXICON_SEARCHABLE_COUNT,
  type MegaLexiconArtifact,
} from "../content/megaLexicon";
import { speakMandarin } from "../lib/speech";

const LEVELS = ["all", "5", "6", "7-9"] as const;
const levelName = (level: string) => level === "7-9" ? "Nâng cao 7–9" : `Cấp ${level}`;

export function MegaLexiconPage() {
  const { missionId } = useParams();
  const [artifact, setArtifact] = useState<MegaLexiconArtifact | null>(null);
  const [error, setError] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");
  const [visibleMissions, setVisibleMissions] = useState(48);

  useEffect(() => {
    let active = true;
    loadMegaLexicon()
      .then((value) => { if (active) setArtifact(value); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Không thể tải kho mở rộng."); });
    return () => { active = false; };
  }, []);

  if (error) return <MegaLoadState error={error} />;
  if (!artifact) return <MegaLoadState />;

  if (missionId) {
    const mission = artifact.missions.find((item) => item.id === missionId);
    const curatedLesson = artifact.curatedLessons.find((item) => item.id === missionId);
    if (mission) return <VocabularyMission artifact={artifact} missionId={mission.id} />;
    if (curatedLesson) return <CuratedLesson artifact={artifact} lessonId={curatedLesson.id} />;
    return <MegaLoadState error="Không tìm thấy ải luyện này." />;
  }

  const advancedMissions = artifact.missions.filter((mission) => ["5", "6", "7-9"].includes(mission.level));
  const filtered = level === "all"
    ? advancedMissions
    : advancedMissions.filter((mission) => mission.level === level);

  return (
    <div className="content-page mega-lexicon-page">
      <header className="page-hero mega-lexicon-hero">
        <div>
          <span className="system-kicker"><LibraryBig size={15} /> VẠN TỰ VIỄN CHINH · SAU HSK4</span>
          <h1>Kho nâng cao ngoài Thiên Lộ</h1>
          <p>HSK1–4 đã được phân vào từng bài trên Thiên Lộ. Khu này chỉ giữ HSK5–9 và tiếng Trung hiện đại để người học tiến xa hơn mà không làm lệch độ khó lộ trình chính.</p>
          <div className="mega-hero-actions">
            <Link className="primary-button" to="/dictionary" viewTransition><Database size={17} /> Tra {MEGA_LEXICON_SEARCHABLE_COUNT.toLocaleString("vi-VN")} mục từ</Link>
          </div>
        </div>
        <div className="mega-stat-grid" aria-label="Quy mô kho mở rộng">
          <span><strong>{advancedMissions.length}</strong><small>ải luyện nâng cao</small></span>
          <span><strong>{artifact.stats.curatedLessons}</strong><small>chuyên đề sâu</small></span>
          <span><strong>{artifact.stats.advancedReferenceVocabulary.toLocaleString("vi-VN")}</strong><small>mục từ sau HSK4</small></span>
        </div>
      </header>

      <section className="mega-curated-section">
        <header>
          <div><span className="system-kicker"><Sparkles size={14} /> BIÊN TẬP SÂU</span><h2>Chuyên đề Trung văn hiện đại</h2></div>
          <p>112 từ có nghĩa Việt, ví dụ, mẫu ngữ pháp và hội thoại theo tình huống.</p>
        </header>
        <div className="mega-curated-grid">
          {artifact.curatedLessons.map((lesson) => (
            <Link to={`/path/expansion/${lesson.id}`} viewTransition key={lesson.id}>
              <span>{lesson.chineseTitle}</span>
              <strong>{lesson.title}</strong>
              <small>{lesson.wordIds.length} từ · ngữ pháp · hội thoại</small>
              <ChevronRight size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mega-mission-section">
        <header>
          <div><span className="system-kicker"><Layers3 size={14} /> ẢI LUYỆN TỪ</span><h2>{advancedMissions.length} chặng nâng cao, mỗi chặng tối đa 20 từ</h2></div>
          <p>Chọn mốc HSK5–9 rồi học theo nhịp của bạn.</p>
        </header>
        <div className="mega-level-tabs" role="group" aria-label="Lọc ải luyện theo cấp">
          {LEVELS.map((item) => (
            <button className={level === item ? "active" : ""} type="button" onClick={() => { setLevel(item); setVisibleMissions(48); }} key={item}>
              {item === "all" ? "Tất cả" : levelName(item)}
            </button>
          ))}
        </div>
        <div className="mega-mission-grid">
          {filtered.slice(0, visibleMissions).map((mission) => (
            <Link to={`/path/expansion/${mission.id}`} viewTransition key={mission.id}>
              <span>{levelName(mission.level)}</span>
              <strong>{mission.title}</strong>
              <small>{mission.wordIds.length} mục từ · nghe · tự gợi nhớ</small>
              <ChevronRight size={17} />
            </Link>
          ))}
        </div>
        {visibleMissions < filtered.length && (
          <button className="secondary-button mega-load-more" type="button" onClick={() => setVisibleMissions((value) => value + 48)}>
            Mở thêm ải ({filtered.length - visibleMissions} còn lại)
          </button>
        )}
      </section>
    </div>
  );
}

function MegaLoadState({ error }: { error?: string }) {
  return (
    <div className="content-page mega-load-state">
      <Database size={32} />
      <h1>{error ? "Kho mở rộng chưa sẵn sàng" : "Đang mở kho 11.093 mục từ…"}</h1>
      <p>{error ?? "Lần đầu tải có thể mất thêm một nhịp; những lần sau trình duyệt sẽ dùng bộ nhớ đệm."}</p>
      {error && <Link className="secondary-button" to="/path">Trở về Thiên Lộ</Link>}
    </div>
  );
}

function VocabularyMission({ artifact, missionId }: { artifact: MegaLexiconArtifact; missionId: string }) {
  const mission = artifact.missions.find((item) => item.id === missionId)!;
  const wordsById = useMemo(() => new Map(artifact.vocabulary.map((word) => [word.id, word])), [artifact]);
  const words = mission.wordIds.map((id) => wordsById.get(id)).filter(Boolean) as MegaLexiconArtifact["vocabulary"];
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const word = words[index];
  const complete = index >= words.length;

  if (complete) {
    return (
      <div className="content-page mega-mission-session mega-mission-complete">
        <BookOpenCheck size={48} />
        <span className="system-kicker">CHẶNG TỰ ÔN ĐÃ KHÉP</span>
        <h1>Bạn đã đi qua {words.length} mục từ</h1>
        <p>Chặng này không cấp XP hay tự nhận là thông thạo. Hãy quay lại khi cần củng cố.</p>
        <Link className="primary-button" to="/path/expansion" viewTransition>Chọn ải tiếp theo <ChevronRight size={17} /></Link>
      </div>
    );
  }

  return (
    <div className="content-page mega-mission-session">
      <header className="mega-session-header">
        <Link to="/path/expansion" aria-label="Trở về kho học mở rộng"><ArrowLeft size={19} /></Link>
        <div><span>{mission.title}</span><strong>{index + 1}/{words.length}</strong></div>
        <i><b style={{ width: `${((index + (revealed ? 1 : 0)) / words.length) * 100}%` }} /></i>
      </header>
      <main className="mega-word-stage">
        <span className="system-kicker"><Headphones size={14} /> NHẬN DIỆN · NGHE · GỢI NHỚ</span>
        <button className="mega-word-audio" type="button" onClick={() => speakMandarin(word.simplified)} aria-label={`Nghe ${word.simplified}`}><Volume2 size={24} /></button>
        <h1>{word.simplified}</h1>
        {word.traditional !== word.simplified && <small>{word.traditional}</small>}
        <div className={revealed ? "mega-word-answer revealed" : "mega-word-answer"} aria-live="polite">
          {revealed ? <><strong>{word.pinyin}</strong><p>{word.meaning}</p><span>{word.partOfSpeech}</span></> : <p>Tự nhớ cách đọc và nghĩa trước khi mở đáp án.</p>}
        </div>
      </main>
      <footer className="mega-session-actions">
        <span>Chặng tự ôn · không cộng XP</span>
        {!revealed ? (
          <button className="primary-button" type="button" onClick={() => setRevealed(true)}>Hiện cách đọc và nghĩa</button>
        ) : (
          <button className="primary-button" type="button" onClick={() => { setIndex((value) => value + 1); setRevealed(false); }}>Từ tiếp theo <ChevronRight size={18} /></button>
        )}
      </footer>
    </div>
  );
}

function CuratedLesson({ artifact, lessonId }: { artifact: MegaLexiconArtifact; lessonId: string }) {
  const lesson = artifact.curatedLessons.find((item) => item.id === lessonId)!;
  const wordsById = useMemo(() => new Map(artifact.vocabulary.map((word) => [word.id, word])), [artifact]);
  const words = lesson.wordIds.map((id) => wordsById.get(id)).filter(Boolean) as MegaLexiconArtifact["vocabulary"];
  return (
    <div className="content-page curated-lesson-page">
      <header className="curated-lesson-header">
        <Link to="/path/expansion" aria-label="Trở về kho học mở rộng"><ArrowLeft size={19} /></Link>
        <div><span className="system-kicker"><Sparkles size={14} /> CHUYÊN ĐỀ BIÊN TẬP SÂU</span><h1>{lesson.title}</h1><p>{lesson.chineseTitle} · {lesson.objective}</p></div>
      </header>
      <section className="curated-grammar-card">
        <span>MẪU NGỮ PHÁP</span><h2>{lesson.grammar.pattern}</h2><p>{lesson.grammar.explanation}</p>
        <blockquote><strong>{lesson.grammar.example}</strong><small>{lesson.grammar.pinyin}</small><p>{lesson.grammar.meaning}</p></blockquote>
      </section>
      <section className="curated-dialogue-card">
        <header><span>HỘI THOẠI TÌNH HUỐNG</span><button type="button" onClick={() => speakMandarin(lesson.dialogue.map((line) => line.chinese).join("。"))}><Volume2 size={17} /> Nghe toàn đoạn</button></header>
        {lesson.dialogue.map((line, index) => <div key={`${line.speaker}-${index}`}><b>{line.speaker}</b><span><strong>{line.chinese}</strong><small>{line.pinyin}</small><p>{line.meaning}</p></span></div>)}
      </section>
      <section className="curated-word-grid">
        {words.map((word) => <article key={word.id}><button type="button" onClick={() => speakMandarin(word.simplified)} aria-label={`Nghe ${word.simplified}`}><Volume2 size={16} /></button><strong>{word.simplified}</strong><span>{word.pinyin}</span><p>{word.meaning}</p><small>{word.example} · {word.exampleMeaning}</small></article>)}
      </section>
    </div>
  );
}
