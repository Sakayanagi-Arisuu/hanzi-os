import {
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleGauge,
  Languages,
  Map,
  MessageCircle,
  Plane,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { useState } from "react";
import { useLearning } from "../store/LearningStore";
import type { LearningGoal, Profile, StartingLevel } from "../types";

const goals: Array<{
  id: LearningGoal;
  title: string;
  description: string;
  icon: typeof MessageCircle;
}> = [
  { id: "conversation", title: "Giao tiếp", description: "Nghe và nói tự nhiên trong đời sống.", icon: MessageCircle },
  { id: "hsk", title: "Chinh phục HSK", description: "Lộ trình thi và kiểm tra định kỳ.", icon: Target },
  { id: "career", title: "Công việc", description: "Họp, email và giao tiếp chuyên nghiệp.", icon: BriefcaseBusiness },
  { id: "travel", title: "Du lịch", description: "Sinh tồn nhanh trong tình huống thật.", icon: Plane },
];

const startingLevels: Array<{
  id: StartingLevel;
  title: string;
  description: string;
}> = [
  { id: "zero", title: "Khởi nguyên", description: "Bắt đầu từ thanh điệu và câu chào đầu tiên" },
  { id: "basic", title: "Đã khai âm", description: "Biết một số từ và mẫu câu đời sống" },
  { id: "hsk1", title: "Nền HSK 1", description: "Có thể đọc và hiểu câu cơ bản" },
  { id: "hsk2", title: "Nền HSK 2+", description: "Khảo nghiệm để đi thẳng vào phần phù hợp" },
];

export function SystemOnboarding() {
  const { actions } = useLearning();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({
    name: "",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "zero",
    onboarded: true,
  });

  const activate = () => {
    actions.finishOnboarding({
      ...profile,
      name: profile.name.trim() || "Hành giả vô danh",
      onboarded: true,
    });
  };

  return (
    <main className="onboarding-shell">
      <div className="onboarding-grid" aria-hidden="true" />
      <section className="onboarding-brand">
        <div className="boot-badge"><ScanLine size={16} /> AWAKENING PROTOCOL 0{step + 1}/03</div>
        <div className="onboarding-logo">
          <span><Languages size={38} /></span>
          <div>
            <strong>HANZI.OS</strong>
            <small>Mandarin Awakening System</small>
          </div>
        </div>
        <h1>Đánh thức một<br /><em>ngôn ngữ mới.</em></h1>
        <p>
          Từ thanh điệu đầu tiên đến hội thoại, đọc và viết. Hệ thống sẽ dựng một
          lộ trình riêng từ bằng chứng học tập của bạn.
        </p>
        <div className="boot-status">
          <span><ShieldCheck size={15} /> FSRS memory core</span>
          <span><CircleGauge size={15} /> 7 năng lực độc lập</span>
          <span><Sparkles size={15} /> Adaptive missions</span>
        </div>
      </section>

      <section className="onboarding-console" aria-live="polite">
        <header>
          <div>
            <small>INITIALIZATION NODE</small>
            <strong>{step === 0 ? "Chọn mục tiêu thức tỉnh" : step === 1 ? "Thiết lập nhịp tu luyện" : "Xác nhận hồ sơ"}</strong>
          </div>
          <div className="step-dots">
            {[0, 1, 2].map((item) => <span className={item <= step ? "active" : ""} key={item} />)}
          </div>
        </header>

        {step === 0 && (
          <div className="goal-grid">
            {goals.map(({ id, title, description, icon: Icon }) => (
              <button
                className={profile.goal === id ? "selected" : ""}
                key={id}
                type="button"
                onClick={() => setProfile((current) => ({ ...current, goal: id }))}
              >
                <Icon size={22} />
                <span><strong>{title}</strong><small>{description}</small></span>
                {profile.goal === id && <Check size={18} />}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="rhythm-panel">
            <label>
              <span>Tên hiển thị</span>
              <input
                value={profile.name}
                placeholder="Hành giả vô danh"
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <fieldset>
              <legend>Điểm xuất phát</legend>
              <div className="starting-level-grid">
                {startingLevels.map((level) => (
                  <button
                    className={profile.startingLevel === level.id ? "selected" : ""}
                    key={level.id}
                    type="button"
                    onClick={() => setProfile((current) => ({ ...current, startingLevel: level.id }))}
                  >
                    <strong>{level.title}</strong>
                    <span>{level.description}</span>
                    {profile.startingLevel === level.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Thời lượng mỗi ngày</legend>
              <div className="segmented-options">
                {([10, 20, 30] as const).map((minutes) => (
                  <button
                    className={profile.dailyMinutes === minutes ? "selected" : ""}
                    key={minutes}
                    type="button"
                    onClick={() => setProfile((current) => ({ ...current, dailyMinutes: minutes }))}
                  >
                    <strong>{minutes}</strong><span>phút</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Hệ chữ ưu tiên</legend>
              <div className="segmented-options script-options">
                <button className={profile.script === "simplified" ? "selected" : ""} type="button" onClick={() => setProfile((current) => ({ ...current, script: "simplified" }))}>
                  <strong>简体</strong><span>Giản thể</span>
                </button>
                <button className={profile.script === "traditional" ? "selected" : ""} type="button" onClick={() => setProfile((current) => ({ ...current, script: "traditional" }))}>
                  <strong>繁體</strong><span>Truyền thống</span>
                </button>
              </div>
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div className="activation-summary">
            <div className="activation-core"><Languages size={34} /><span /></div>
            <h2>Hồ sơ đã sẵn sàng</h2>
            <dl>
              <div><dt>Danh xưng</dt><dd>{profile.name || "Hành giả vô danh"}</dd></div>
              <div><dt>Mục tiêu</dt><dd>{goals.find((goal) => goal.id === profile.goal)?.title}</dd></div>
              <div><dt>Căn cơ</dt><dd>{startingLevels.find((level) => level.id === profile.startingLevel)?.title}</dd></div>
              <div><dt>Nhịp học</dt><dd>{profile.dailyMinutes} phút/ngày</dd></div>
              <div><dt>Hệ chữ</dt><dd>{profile.script === "simplified" ? "Giản thể" : "Truyền thống"}</dd></div>
            </dl>
            <p><Map size={16} /> Hệ thống sẽ đề nghị khảo nghiệm ngắn để hiệu chỉnh điểm xuất phát sau khi kích hoạt.</p>
          </div>
        )}

        <footer>
          {step > 0 ? <button className="back-button" type="button" onClick={() => setStep((current) => current - 1)}>Quay lại</button> : <span />}
          <button className="activate-button" type="button" onClick={() => step < 2 ? setStep((current) => current + 1) : activate()}>
            {step < 2 ? "Tiếp tục thiết lập" : "Kích hoạt HANZI.OS"}
            <ChevronRight size={18} />
          </button>
        </footer>
      </section>
    </main>
  );
}
