import {
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Languages,
  MessageCircle,
  Plane,
  Target,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HSK_STARTING_LEVEL_OPTIONS } from "../data/hskLearningPaths";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { useLearning } from "../store/LearningStore";
import type { LearningGoal, Profile, StartingLevel } from "../types";
import { ResponsiveHeroBackdrop } from "./ResponsiveHeroBackdrop";

type SystemOnboardingProps = {
  onComplete?: () => void;
  onExit?: () => void;
};

const goals: Array<{
  id: LearningGoal;
  title: string;
  description: string;
  icon: typeof MessageCircle;
}> = [
  {
    id: "conversation",
    title: "Giao tiếp hằng ngày",
    description: "Ưu tiên nghe, nói và những tình huống gần gũi.",
    icon: MessageCircle,
  },
  {
    id: "hsk",
    title: "Học theo lộ trình HSK",
    description: "Đi từng chặng từ nền tảng đến HSK4.",
    icon: Target,
  },
  {
    id: "career",
    title: "Dùng trong công việc",
    description: "Tập trung vào hội thoại và từ vựng chuyên nghiệp.",
    icon: BriefcaseBusiness,
  },
  {
    id: "travel",
    title: "Dùng khi du lịch",
    description: "Học các tình huống cần thiết trong chuyến đi.",
    icon: Plane,
  },
];

const levelCopy: Record<Exclude<StartingLevel, "basic">, {
  title: string;
  description: string;
}> = {
  zero: {
    title: "Mới bắt đầu",
    description: "Chưa học hoặc muốn bắt đầu lại từ Pinyin và thanh điệu.",
  },
  hsk1: {
    title: "Đã học khoảng HSK1",
    description: "Biết một số từ và mẫu câu rất cơ bản.",
  },
  hsk2: {
    title: "Đã học khoảng HSK2",
    description: "Hiểu và dùng được các câu quen thuộc hằng ngày.",
  },
  hsk3: {
    title: "Đã học khoảng HSK3",
    description: "Giao tiếp trong tình huống quen thuộc và đọc đoạn ngắn.",
  },
  hsk4: {
    title: "Đã học khoảng HSK4",
    description: "Đọc, nghe và diễn đạt được nhiều chủ đề thông dụng.",
  },
};

const startingLevels = HSK_STARTING_LEVEL_OPTIONS.map(({ id }) => ({
  id,
  ...levelCopy[id],
}));

const dailyMinuteOptions = [10, 20, 30] as const;

const stepCopy = [
  {
    kicker: "Mục tiêu học",
    title: "Bạn học tiếng Trung để làm gì?",
    description: "Chọn mục tiêu gần nhất. Bạn có thể đổi lại trong Hồ sơ bất cứ lúc nào.",
  },
  {
    kicker: "Trình độ hiện tại",
    title: "Bạn muốn bắt đầu từ đâu?",
    description: "Không cần chọn thật chính xác. Hệ thống sẽ điều chỉnh sau khi có thêm kết quả học.",
  },
  {
    kicker: "Nhịp học phù hợp",
    title: "Bạn muốn học bao lâu mỗi ngày?",
    description: "Một lịch ngắn và đều thường dễ duy trì hơn một buổi học quá dài.",
  },
] as const;

export function SystemOnboarding({ onComplete, onExit }: SystemOnboardingProps) {
  const { actions, state } = useLearning();
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [profile, setProfile] = useState<Profile>(() => state.profile.onboarded
    ? { ...state.profile }
    : {
        name: "",
        goal: "conversation",
        dailyMinutes: 20,
        script: "simplified",
        startingLevel: "zero",
        onboarded: true,
      });

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const goToStep = (nextStep: number) => {
    setStep(Math.max(0, Math.min(stepCopy.length - 1, nextStep)));
  };

  const activate = () => {
    const persisted = actions.finishOnboarding({
      ...profile,
      name: profile.name.trim() || "Hành giả vô danh",
      onboarded: true,
    });
    if (persisted) onComplete?.();
  };

  const currentStep = stepCopy[step]!;

  return (
    <main className="setup-shell" data-testid="onboarding-wizard">
      <ResponsiveHeroBackdrop priority />
      <div className="setup-grid" aria-hidden="true" />

      <header className="setup-header">
        <a className="setup-brand" href="/welcome" onClick={(event) => {
          if (!onExit) return;
          event.preventDefault();
          onExit();
        }}>
          <span><Languages aria-hidden="true" size={25} /></span>
          <div><strong>HANZI.OS</strong><small>Thiết lập lộ trình</small></div>
        </a>
        <button className="setup-exit" type="button" onClick={onExit}>
          <ChevronLeft aria-hidden="true" size={17} />
          Về trang giới thiệu
        </button>
      </header>

      <section className="setup-card" aria-labelledby="setup-step-title">
        <header className="setup-progress">
          <span>Bước {step + 1} trong {stepCopy.length}</span>
          <ol aria-label={`Tiến độ thiết lập: bước ${step + 1} trong ${stepCopy.length}`}>
            {stepCopy.map((item, index) => (
              <li
                aria-current={index === step ? "step" : undefined}
                className={index <= step ? "is-complete" : ""}
                key={index}
              >
                <span className="sr-only">{item.kicker}</span>
              </li>
            ))}
          </ol>
        </header>

        <div className="setup-body">
          <p className="setup-kicker">{currentStep.kicker}</p>
          <h1 id="setup-step-title" ref={headingRef} tabIndex={-1}>{currentStep.title}</h1>
          <p className="setup-description">{currentStep.description}</p>

          {step === 0 && (
            <div className="setup-option-grid setup-goal-grid" role="radiogroup" aria-label="Mục tiêu học">
              {goals.map(({ id, title, description, icon: Icon }, optionIndex) => (
                <button
                  className={profile.goal === id ? "is-selected" : ""}
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
                  <span className="setup-option-icon"><Icon aria-hidden="true" size={20} /></span>
                  <span className="setup-option-copy"><strong>{title}</strong><small>{description}</small></span>
                  <Check className="setup-option-check" aria-hidden="true" size={18} />
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="setup-option-grid setup-level-grid" role="radiogroup" aria-label="Trình độ hiện tại">
              {startingLevels.map((level, optionIndex) => (
                <button
                  className={profile.startingLevel === level.id ? "is-selected" : ""}
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
                  <span className="setup-option-copy"><strong>{level.title}</strong><small>{level.description}</small></span>
                  <Check className="setup-option-check" aria-hidden="true" size={18} />
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="setup-preferences">
              <fieldset>
                <legend id="setup-daily-minutes-legend"><Clock3 aria-hidden="true" size={17} /> Thời lượng mỗi ngày</legend>
                <div className="setup-minutes" role="radiogroup" aria-labelledby="setup-daily-minutes-legend">
                  {dailyMinuteOptions.map((minutes, optionIndex) => (
                    <button
                      className={profile.dailyMinutes === minutes ? "is-selected" : ""}
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

              <label className="setup-name-field" htmlFor="setup-display-name">
                <span><UserRound aria-hidden="true" size={17} /> Tên hiển thị <small>không bắt buộc</small></span>
                <input
                  autoComplete="nickname"
                  id="setup-display-name"
                  maxLength={40}
                  value={profile.name}
                  placeholder="Ví dụ: Minh Anh"
                  onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <fieldset className="setup-script-choice">
                <legend><BookOpenCheck aria-hidden="true" size={17} /> Hệ chữ hiển thị</legend>
                <div role="radiogroup" aria-label="Hệ chữ hiển thị">
                  <button type="button" role="radio" aria-checked={profile.script === "simplified"} className={profile.script === "simplified" ? "is-selected" : ""} onClick={() => setProfile((current) => ({ ...current, script: "simplified" }))}>
                    <strong>简 · Giản thể</strong><small>Lộ trình chính, đầy đủ bàn nét đã kiểm chứng.</small>
                  </button>
                  <button type="button" role="radio" aria-checked={profile.script === "traditional"} className={profile.script === "traditional" ? "is-selected" : ""} onClick={() => setProfile((current) => ({ ...current, script: "traditional" }))}>
                    <strong>繁 · Phồn thể</strong><small>Đổi chữ trong bài, ôn tập, đọc và từ điển; bàn nét chỉ mở khi có dữ liệu hợp lệ.</small>
                  </button>
                </div>
              </fieldset>
            </div>
          )}
        </div>

        <footer className="setup-actions">
          <button className="setup-secondary-button" type="button" onClick={() => {
            if (step === 0) onExit?.();
            else goToStep(step - 1);
          }}>
            <ChevronLeft aria-hidden="true" size={18} />
            {step === 0 ? "Trang giới thiệu" : "Quay lại"}
          </button>
          <button className="setup-primary-button" type="button" onClick={() => {
            if (step < stepCopy.length - 1) goToStep(step + 1);
            else activate();
          }}>
            {step < stepCopy.length - 1 ? "Tiếp tục" : "Bắt đầu Khảo Nghiệm Căn Cơ"}
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </footer>
      </section>
    </main>
  );
}
