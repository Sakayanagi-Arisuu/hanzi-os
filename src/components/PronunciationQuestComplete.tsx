import {
  AudioLines,
  ChevronRight,
  Gem,
  LibraryBig,
  Map,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { PRONUNCIATION_QUEST_XP } from "../learning/pronunciationPractice";

export function PronunciationQuestComplete({
  lessonTitle,
  phraseCount,
  assessedCount,
  rewardAwarded,
  onReplay,
  onChooseLesson,
}: {
  lessonTitle: string;
  phraseCount: number;
  assessedCount: number;
  rewardAwarded: boolean | null;
  onReplay: () => void;
  onChooseLesson: () => void;
}) {
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    resultRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      ref={resultRef}
      tabIndex={-1}
      className="resonance-clear-screen"
      data-testid="pronunciation-quest-complete"
      aria-labelledby="pronunciation-complete-title"
    >
      <div className="resonance-clear-atmosphere" aria-hidden="true">
        <span>声</span><i /><i /><i />
      </div>

      <header className="resonance-clear-topline">
        <span><AudioLines aria-hidden="true" /> VẠN ÂM ĐIỆN · PHIÊN LUYỆN ĐỌC</span>
        <strong><Sparkles aria-hidden="true" /> CỘNG HƯỞNG ỔN ĐỊNH</strong>
      </header>

      <div className="resonance-clear-content">
        <div className="resonance-clear-core" aria-hidden="true">
          <div className="resonance-clear-wave">
            {Array.from({ length: 13 }, (_, index) => <i key={index} />)}
          </div>
          <div className="resonance-clear-crystal">
            <AudioLines />
            <span>{phraseCount}/{phraseCount}</span>
          </div>
          <b /><b /><b />
        </div>

        <div className="resonance-clear-copy">
          <p>CHIẾN BÁO ÂM VỰC</p>
          <h2 id="pronunciation-complete-title">Cộng hưởng hoàn tất</h2>
          <strong>{lessonTitle}</strong>
          <span>Toàn bộ câu luyện đã đi qua lõi cộng hưởng. Bạn có thể chọn ngay một bài khác mà không rời Vạn Âm Điện.</span>

          <aside className="resonance-clear-reward" aria-label={`Phần thưởng ${PRONUNCIATION_QUEST_XP} XP`}>
            <Gem aria-hidden="true" />
            <div>
              <span>THƯỞNG PHIÊN LUYỆN</span>
              <small>{rewardAwarded === null
                ? "Đang ghi nhận vào hành trình"
                : rewardAwarded
                  ? "Kinh nghiệm đã cộng vào hành trình"
                  : "Phần thưởng hôm nay đã được nhận"}</small>
            </div>
            <strong>+{PRONUNCIATION_QUEST_XP} XP</strong>
          </aside>

          <div className="resonance-clear-summary" aria-label="Kết quả phiên luyện đọc">
            <span><b>{assessedCount}</b> câu đối chiếu âm học</span>
            <span><b>{Math.max(0, phraseCount - assessedCount)}</b> câu tự luyện</span>
          </div>
        </div>
      </div>

      <footer className="resonance-clear-actions">
        <Link className="resonance-clear-action is-quiet" to="/path">
          <Map aria-hidden="true" /> Thiên Lộ
        </Link>
        <button className="resonance-clear-action is-quiet" type="button" onClick={onReplay}>
          <RotateCcw aria-hidden="true" /> Luyện lại bài này
        </button>
        <button className="resonance-clear-action is-primary" type="button" onClick={onChooseLesson}>
          <LibraryBig aria-hidden="true" /> Chọn bài luyện khác <ChevronRight aria-hidden="true" />
        </button>
      </footer>
    </section>
  );
}
