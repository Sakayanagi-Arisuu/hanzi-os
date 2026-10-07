import { ArrowLeft, ArrowRight, BookOpen, Clock3, FileText, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { defaultPlacementLevel, PLACEMENT_LEVEL_OPTIONS, type PlacementLevel } from "../assessment/placementPolicy";
import { resolvePlacementResumeDestination } from "../assessment/placementResume";
import { hasLearningProgress } from "../assessment/placementSafety";
import { usePlacementContext } from "../assessment/usePlacementContext";
import { useLearning } from "../store/LearningStore";
import "./PlacementNgocDien.css";

export function AssessmentPage() {
  const { state, actions, sync } = useLearning();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<"overview" | "levels">("overview");
  const [experience, setExperience] = useState("experienced");
  const [selectedLevel, setSelectedLevel] = useState<PlacementLevel>(() => defaultPlacementLevel(state.profile.startingLevel));
  const heading = useRef<HTMLHeadingElement>(null);
  const context = usePlacementContext();
  const learning = hasLearningProgress(state) || context.preservePath;
  const resume = context.ready ? resolvePlacementResumeDestination(undefined, { state, ownerKey: sync.ownerKey, contextSnapshot: context.snapshot }) : null;
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [screen]);
  const proceed = () => {
    if (!context.ready) return;
    if (screen === "levels") { navigate(`/assessment/placement/hsk${selectedLevel}`); return; }
    if (experience === "beginner") {
      if (!learning) actions.skipDiagnostic();
      navigate(learning ? "/path" : "/lesson/boot-1");
    } else setScreen("levels");
  };
  return <section className="ngoc-placement" data-testid="placement-gateway" data-screen={screen}>
    <header className="np-topline">
      <span>NGỌC ĐIỆN · ĐỊNH HƯỚNG HỌC TẬP</span>
      <ol aria-label="Các bước khảo nghiệm"><li aria-current="step"><b>01</b> Điểm khởi hành</li><li><b>02</b> Khảo nghiệm</li><li><b>03</b> Lộ trình</li></ol>
    </header>
    <div className="np-card">
      <aside className="np-art" aria-label="Cổng Ngọc Điện"><div><div className="realm-emblem" aria-hidden="true" /><h2>Hiểu căn cơ.<br />Mở đúng Thiên Lộ.</h2><p>Bắt đầu phù hợp. Tiến bước vững vàng.</p><i /></div></aside>
      <div className="np-panel" data-testid={screen === "overview" ? "placement-overview-screen" : "placement-level-screen"}>
        <div className="np-content">
          <span className="np-eyebrow">KHẢO NGHIỆM CĂN CƠ</span>
          <h1 ref={heading} tabIndex={-1}>{screen === "overview" ? "Tìm điểm khởi hành" : "Chọn tầng khảo nghiệm"}</h1>
          <p className="np-description">{screen === "overview" ? "Một lượt khảo sát ngắn để đề xuất nơi bắt đầu phù hợp với bạn." : "Chọn mức gần với điều bạn đã học. Kết quả sẽ gợi ý thử tầng cao hơn hoặc kiểm tra lại nền tảng."}</p>
          {screen === "overview" ? <>
            <div className="np-facts"><div><FileText /><span><strong>12 câu</strong><small>mỗi tầng</small></span></div><div><Clock3 /><span><strong>8–12 phút</strong><small>một lượt</small></span></div><div><BookOpen /><span><strong>3 kỹ năng</strong><small>đọc · từ · ngữ pháp</small></span></div></div>
            {resume && <div className="np-resume"><strong>Phiên gần đây · HSK{resume.level}</strong><p>{resume.phase === "question" ? `Đã lưu trước câu ${resume.questionNumber}.` : "Kết quả đang chờ bạn xem lại."}</p><Link to={resume.href}>{resume.phase === "question" ? "Tiếp tục phiên đã lưu" : "Xem kết quả"} <ArrowRight size={16} /></Link></div>}
            <fieldset className="np-options"><legend>{learning ? "Bạn muốn tiếp tục thế nào?" : "Bạn đã từng học tiếng Trung?"}</legend>
              <label><input type="radio" name="experience" value="experienced" checked={experience === "experienced"} onChange={() => setExperience("experienced")} /><span><strong>{learning ? "Khảo sát lại năng lực" : "Đã từng học"}</strong><small>{learning ? "Tìm phần cần củng cố, giữ hành trình hiện tại." : "Khảo nghiệm để tìm điểm khởi hành."}</small></span></label>
              <label><input type="radio" name="experience" value="beginner" checked={experience === "beginner"} onChange={() => setExperience("beginner")} /><span><strong>{learning ? "Tiếp tục Thiên Lộ" : "Mới bắt đầu"}</strong><small>{learning ? "Trở về lộ trình đang học của bạn." : "Vào HSK0, làm quen âm và chữ."}</small></span></label>
            </fieldset>
          </> : <fieldset className="np-options np-levels"><legend>Mức gần với năng lực của bạn</legend>{PLACEMENT_LEVEL_OPTIONS.map((option) => <label key={option.level}><input type="radio" name="level" checked={selectedLevel === option.level} onChange={() => setSelectedLevel(option.level)} /><span><strong>{option.title}</strong><small>{option.description}</small></span></label>)}</fieldset>}
          <p className="np-protection"><ShieldCheck size={21} /> Tiến trình đã học luôn được giữ nguyên.</p>
          {!context.ready && <p role="status">{context.failed ? "Chưa đọc được tiến trình. Hãy thử lại trước khi khảo nghiệm." : "Đang đối chiếu hành trình của bạn…"}{context.failed && <button className="np-back" type="button" onClick={context.retry}>Thử lại</button>}</p>}
          <details className="np-method"><summary><BookOpen size={18} /> Cách đánh giá và bảo toàn tiến trình</summary><div>
            <p>Mỗi tầng có 4 câu đọc hiểu, 4 câu từ vựng và 4 câu ngữ pháp. Chọn “Chưa biết” khi chưa chắc; đáp án chỉ mở sau lượt làm.</p>
            <p>Đúng từ 80% và mỗi kỹ năng từ 60%: có thể thử tầng trên. Từ 60%: học và củng cố tầng đang khảo sát. Thấp hơn: xác minh tầng dưới. Đây là quy tắc định hướng chưa qua hiệu chuẩn độc lập; nghe, nói và viết chưa được đánh giá.</p>
            <p>Phiên chỉ tiếp tục trong 7 ngày và khi hành trình chưa thay đổi. Nếu bạn đã học thêm, hệ thống mời khảo nghiệm lại. Kết quả không xóa bài đã học, không cộng thành thạo và không tự bỏ qua bài nền. Người đã học giữ nguyên lộ trình.</p>
          </div></details>
        </div>
        <footer className="np-actions">
          {screen === "levels" && <button className="np-back" type="button" onClick={() => setScreen("overview")} aria-label="Quay lại giới thiệu"><ArrowLeft size={20} /></button>}
          <button className="np-primary" type="button" disabled={!context.ready} onClick={proceed}>{screen === "levels" ? `Mở Khảo Nghiệm HSK${selectedLevel}` : "Tiếp tục"}<ArrowRight size={20} /></button>
        </footer>
      </div>
    </div>
    <p className="np-disclaimer">Kết quả định hướng học tập, không thay thế chứng chỉ HSK.</p>
  </section>;
}
