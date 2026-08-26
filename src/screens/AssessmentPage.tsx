import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Headphones,
  Route,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  defaultPlacementLevel,
  PLACEMENT_LEVEL_OPTIONS,
  PLACEMENT_REFERENCE_LINKS,
  type PlacementLevel,
} from "../assessment/placementPolicy";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { useLearning } from "../store/LearningStore";

export function AssessmentPage() {
  const { state, actions } = useLearning();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<"overview" | "levels">("overview");
  const [selectedLevel, setSelectedLevel] = useState<PlacementLevel>(() =>
    defaultPlacementLevel(state.profile.startingLevel)
  );
  const screenHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    screenHeadingRef.current?.focus({ preventScroll: true });
  }, [screen]);

  const skipForBeginner = () => {
    actions.skipDiagnostic();
    navigate("/lesson/boot-1");
  };

  return (
    <main
      className="assessment-intro placement-gateway"
      data-screen={screen}
      data-testid="placement-gateway"
    >
      {screen === "overview" ? (
        <section className="placement-screen placement-overview" data-testid="placement-overview-screen">
          <div className="assessment-core"><BrainCircuit size={38} /><span /></div>
          <span className="system-kicker"><Sparkles size={15} /> KHẢO NGHIỆM CĂN CƠ · BẢN ĐỊNH HƯỚNG</span>
          <h1 ref={screenHeadingRef} tabIndex={-1}>Khảo Nghiệm Căn Cơ</h1>
          <p>
            Hệ thống quan sát đọc, từ vựng và ngữ pháp để đề xuất điểm khởi hành
            từ HSK0 đến HSK4. Đây là định hướng học tập, không phải chứng chỉ HSK.
          </p>

          <div className="assessment-facts placement-facts" aria-label="Phạm vi Khảo Nghiệm Căn Cơ">
            <span><Headphones size={18} /><strong>3 phương diện</strong><small>đọc · từ vựng · ngữ pháp</small></span>
            <span><BookOpenCheck size={18} /><strong>12 câu mỗi tầng</strong><small>đi theo bậc thang khi cần</small></span>
            <span><ShieldCheck size={18} /><strong>Niêm phong đáp án</strong><small>kết quả mở sau câu cuối</small></span>
          </div>

          <div className="assessment-actions placement-actions">
            <button className="secondary-button" type="button" onClick={skipForBeginner}>
              Ta chưa biết gì · bắt đầu từ số 0
            </button>
            <button className="primary-button" type="button" onClick={() => setScreen("levels")}>
              Chọn tầng Khảo Nghiệm <ArrowRight size={18} />
            </button>
          </div>

          <details className="placement-method">
            <summary><ScrollText size={17} /> Cách hệ thống đề xuất điểm khởi hành</summary>
            <div>
              <p>
                Từ 80% và không phương diện nào dưới 60% mới được gợi ý thử tầng kế;
                60–79% giữ tầng hiện tại; dưới 60% khảo nghiệm tiếp tầng dưới.
                Phần nghe TTS chỉ để tham khảo, không tham gia đề xuất.
              </p>
              <p>
                Ngân hàng câu hỏi chưa qua hiệu chuẩn thống kê độc lập và chưa chấm
                nói, viết. Điểm khởi hành chỉ được đổi khi hành giả tự xác nhận.
              </p>
              <ul>
                {PLACEMENT_REFERENCE_LINKS.map((source) => (
                  <li key={source.href}>
                    <a href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </section>
      ) : (
        <section className="placement-screen placement-levels" data-testid="placement-level-screen">
          <header className="placement-step-heading">
            <button
              className="icon-button"
              type="button"
              onClick={() => setScreen("overview")}
              aria-label="Quay lại giới thiệu Khảo Nghiệm Căn Cơ"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <span className="system-kicker">KHẢO NGHIỆM CĂN CƠ · CHỌN TẦNG</span>
              <h1 ref={screenHeadingRef} tabIndex={-1}>Hành giả muốn bắt đầu từ đâu?</h1>
            </div>
            <Route size={24} aria-hidden="true" />
          </header>

          <section className="placement-level-panel" aria-label="Chọn tầng Khảo Nghiệm Căn Cơ">
            <div className="placement-level-grid" role="radiogroup" aria-label="Chọn tầng Khảo Nghiệm">
              {PLACEMENT_LEVEL_OPTIONS.map((option, optionIndex) => (
                <button
                  className={selectedLevel === option.level ? "is-selected" : ""}
                  data-radio-index={optionIndex}
                  key={option.level}
                  role="radio"
                  aria-checked={selectedLevel === option.level}
                  tabIndex={selectedLevel === option.level ? 0 : -1}
                  type="button"
                  onClick={() => setSelectedLevel(option.level)}
                  onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                    currentIndex: optionIndex,
                    itemCount: PLACEMENT_LEVEL_OPTIONS.length,
                    onSelect: (nextIndex) => setSelectedLevel(
                      PLACEMENT_LEVEL_OPTIONS[nextIndex]!.level,
                    ),
                  })}
                >
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                  <small>{option.itemCount} câu · {option.duration}</small>
                </button>
              ))}
            </div>
          </section>

          <div className="assessment-actions placement-actions">
            <button className="secondary-button" type="button" onClick={skipForBeginner}>
              Bắt đầu từ số 0
            </button>
            <Link className="primary-button" to={`/assessment/placement/hsk${selectedLevel}`}>
              Mở Khảo Nghiệm HSK{selectedLevel} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
