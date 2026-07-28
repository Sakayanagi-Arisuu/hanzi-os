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
import { ResponsiveHeroBackdrop } from "./ResponsiveHeroBackdrop";
import { HSK_STARTING_LEVEL_OPTIONS } from "../data/hskLearningPaths";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { useLearning } from "../store/LearningStore";
import type { LearningGoal, Profile } from "../types";

const goals: Array<{
  id: LearningGoal;
  title: string;
  description: string;
  icon: typeof MessageCircle;
}> = [
  { id: "conversation", title: "Giao tiếp", description: "Nghe và nói tự nhiên trong đời sống.", icon: MessageCircle },
  { id: "hsk", title: "Hướng tới HSK", description: "Ưu tiên kỹ năng nền; chưa phải lộ trình luyện thi hoàn chỉnh.", icon: Target },
  { id: "career", title: "Công việc", description: "Họp, email và giao tiếp chuyên nghiệp.", icon: BriefcaseBusiness },
  { id: "travel", title: "Du lịch", description: "Sinh tồn nhanh trong tình huống thật.", icon: Plane },
];

const startingLevels = HSK_STARTING_LEVEL_OPTIONS;

const dailyMinuteOptions = [10, 20, 30] as const;
const scriptOptions = ["simplified", "traditional"] as const;

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
      <ResponsiveHeroBackdrop priority />
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
          <div
            className="goal-grid"
            role="radiogroup"
            aria-label="Mục tiêu thức tỉnh"
          >
            {goals.map(({ id, title, description, icon: Icon }, optionIndex) => (
              <button
                className={profile.goal === id ? "selected" : ""}
                data-radio-index={optionIndex}
                key={id}
                role="radio"
                aria-checked={profile.goal === id}
                tabIndex={profile.goal === id ? 0 : -1}
                type="button"
                onClick={() => setProfile((current) => ({ ...current, goal: id }))}
                onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                  currentIndex: optionIndex,
                  itemCount: goals.length,
                  onSelect: (nextIndex) => setProfile((current) => ({
                    ...current,
                    goal: goals[nextIndex]!.id,
                  })),
                })}
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
              <legend id="onboarding-starting-level-legend">Điểm xuất phát</legend>
              <div
                className="starting-level-grid"
                role="radiogroup"
                aria-labelledby="onboarding-starting-level-legend"
              >
                {startingLevels.map((level, optionIndex) => (
                  <button
                    className={profile.startingLevel === level.id ? "selected" : ""}
                    data-radio-index={optionIndex}
                    key={level.id}
                    role="radio"
                    aria-checked={profile.startingLevel === level.id}
                    tabIndex={profile.startingLevel === level.id ? 0 : -1}
                    type="button"
                    onClick={() => setProfile((current) => ({ ...current, startingLevel: level.id }))}
                    onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                      currentIndex: optionIndex,
                      itemCount: startingLevels.length,
                      onSelect: (nextIndex) => setProfile((current) => ({
                        ...current,
                        startingLevel: startingLevels[nextIndex]!.id,
                      })),
                    })}
                  >
                    <strong>{level.title}</strong>
                    <span>{level.description}</span>
                    {profile.startingLevel === level.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend id="onboarding-daily-minutes-legend">Thời lượng mỗi ngày</legend>
              <div
                className="segmented-options"
                role="radiogroup"
                aria-labelledby="onboarding-daily-minutes-legend"
              >
                {dailyMinuteOptions.map((minutes, optionIndex) => (
                  <button
                    className={profile.dailyMinutes === minutes ? "selected" : ""}
                    data-radio-index={optionIndex}
                    key={minutes}
                    role="radio"
                    aria-checked={profile.dailyMinutes === minutes}
                    tabIndex={profile.dailyMinutes === minutes ? 0 : -1}
                    type="button"
                    onClick={() => setProfile((current) => ({ ...current, dailyMinutes: minutes }))}
                    onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                      currentIndex: optionIndex,
                      itemCount: dailyMinuteOptions.length,
                      onSelect: (nextIndex) => setProfile((current) => ({
                        ...current,
                        dailyMinutes: dailyMinuteOptions[nextIndex]!,
                      })),
                    })}
                  >
                    <strong>{minutes}</strong><span>phút</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend id="onboarding-script-legend">Hệ chữ ưu tiên</legend>
              <div
                className="segmented-options script-options"
                role="radiogroup"
                aria-labelledby="onboarding-script-legend"
              >
                <button
                  className={profile.script === "simplified" ? "selected" : ""}
                  data-radio-index={0}
                  role="radio"
                  aria-checked={profile.script === "simplified"}
                  tabIndex={profile.script === "simplified" ? 0 : -1}
                  type="button"
                  onClick={() => setProfile((current) => ({ ...current, script: "simplified" }))}
                  onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                    currentIndex: 0,
                    itemCount: scriptOptions.length,
                    onSelect: (nextIndex) => setProfile((current) => ({
                      ...current,
                      script: scriptOptions[nextIndex]!,
                    })),
                  })}
                >
                  <strong>简体</strong><span>Giản thể</span>
                </button>
                <button
                  className={profile.script === "traditional" ? "selected" : ""}
                  data-radio-index={1}
                  role="radio"
                  aria-checked={profile.script === "traditional"}
                  tabIndex={profile.script === "traditional" ? 0 : -1}
                  type="button"
                  onClick={() => setProfile((current) => ({ ...current, script: "traditional" }))}
                  onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                    currentIndex: 1,
                    itemCount: scriptOptions.length,
                    onSelect: (nextIndex) => setProfile((current) => ({
                      ...current,
                      script: scriptOptions[nextIndex]!,
                    })),
                  })}
                >
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
