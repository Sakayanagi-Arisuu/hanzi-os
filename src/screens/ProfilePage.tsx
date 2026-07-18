import {
  BriefcaseBusiness,
  Check,
  CircleUserRound,
  Database,
  Download,
  Languages,
  MessageCircle,
  Plane,
  Radar,
  RotateCcw,
  Save,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal, useSystemFeedback } from "../components/SystemFeedback";
import { useLearning } from "../store/LearningStore";
import type { LearningGoal, Profile, StartingLevel } from "../types";

const goals: Array<{ id: LearningGoal; label: string; description: string; icon: typeof Target }> = [
  { id: "conversation", label: "Giao tiếp", description: "Ưu tiên nghe và nói đời sống", icon: MessageCircle },
  { id: "hsk", label: "HSK", description: "Ưu tiên chuẩn đầu ra và đề thi", icon: Target },
  { id: "career", label: "Công việc", description: "Ưu tiên ngôn ngữ chuyên nghiệp", icon: BriefcaseBusiness },
  { id: "travel", label: "Du lịch", description: "Ưu tiên tình huống sinh tồn", icon: Plane },
];

const startingLevels: Array<{ id: StartingLevel; label: string }> = [
  { id: "zero", label: "Khởi nguyên" },
  { id: "basic", label: "Đã khai âm" },
  { id: "hsk1", label: "Nền HSK 1" },
  { id: "hsk2", label: "Nền HSK 2+" },
];

export function ProfilePage() {
  const { state, actions, level } = useLearning();
  const { notify } = useSystemFeedback();
  const [draft, setDraft] = useState<Profile>(state.profile);
  const [saved, setSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const updateDraft = (patch: Partial<Profile>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const save = () => {
    actions.updateProfile({ ...draft, name: draft.name.trim() || "Hành giả vô danh" });
    setSaved(true);
    notify("Cấu hình hành trình đã được đồng bộ trên thiết bị này.");
  };

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hanzi-os-progress-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setShowResetConfirm(false);
    actions.resetProgress();
    notify("Dữ liệu cục bộ đã được xóa. Hệ thống trở về trạng thái khởi nguyên.", "warning");
  };

  return (
    <div className="content-page profile-page">
      <header className="page-hero profile-hero">
        <div>
          <span className="system-kicker"><CircleUserRound size={15} /> IDENTITY & SYSTEM CONTROL</span>
          <h1>Hồ sơ Hành Giả</h1>
          <p>Điều chỉnh mục tiêu, nhịp học và dữ liệu cá nhân đang lưu trên thiết bị.</p>
        </div>
        <div className="profile-rank-badge"><span>RANK</span><strong>{String(level).padStart(2, "0")}</strong><small>{state.xp} XP</small></div>
      </header>

      <div className="profile-layout">
        <section className="profile-settings">
          <header className="section-heading"><div><span>LEARNER CONFIG</span><h2>Cấu hình hành trình</h2></div><Languages size={21} /></header>
          <label className="field-label">
            <span>Tên hiển thị</span>
            <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} maxLength={40} />
          </label>
          <fieldset className="profile-fieldset">
            <legend>Mục tiêu chính</legend>
            <div className="goal-option-grid">
              {goals.map(({ id, label, description, icon: Icon }) => (
                <button className={draft.goal === id ? "active" : ""} key={id} type="button" onClick={() => updateDraft({ goal: id })}>
                  <Icon size={19} /><span><strong>{label}</strong><small>{description}</small></span>{draft.goal === id && <Check size={17} />}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="profile-fieldset inline-fieldset">
            <legend>Thời lượng mỗi ngày</legend>
            <div className="segmented-control">
              {([10, 20, 30] as const).map((minutes) => <button className={draft.dailyMinutes === minutes ? "active" : ""} key={minutes} type="button" onClick={() => updateDraft({ dailyMinutes: minutes })}>{minutes} phút</button>)}
            </div>
          </fieldset>
          <fieldset className="profile-fieldset inline-fieldset">
            <legend>Căn cơ tự khai báo</legend>
            <div className="segmented-control starting-control">
              {startingLevels.map((item) => (
                <button className={draft.startingLevel === item.id ? "active" : ""} key={item.id} type="button" onClick={() => updateDraft({ startingLevel: item.id })}>{item.label}</button>
              ))}
            </div>
            <Link className="assessment-inline-link" to="/assessment"><Radar size={16} /> Khảo nghiệm để hệ thống tự hiệu chỉnh</Link>
          </fieldset>
          <fieldset className="profile-fieldset inline-fieldset">
            <legend>Hệ chữ ưu tiên</legend>
            <div className="segmented-control script-control">
              <button className={draft.script === "simplified" ? "active" : ""} type="button" onClick={() => updateDraft({ script: "simplified" })}>简体 · Giản thể</button>
              <button className={draft.script === "traditional" ? "active" : ""} type="button" onClick={() => updateDraft({ script: "traditional" })}>繁體 · Phồn thể</button>
            </div>
          </fieldset>
          <button className="primary-button profile-save" type="button" onClick={save}>{saved ? <Check size={18} /> : <Save size={18} />}{saved ? "Đã lưu cấu hình" : "Lưu cấu hình"}</button>
        </section>

        <aside className="data-control-panel">
          <header className="section-heading"><div><span>LOCAL DATA VAULT</span><h2>Kho dữ liệu</h2></div><Database size={21} /></header>
          <div className="data-status">
            <ShieldCheck size={24} />
            <div><strong>Dữ liệu nằm trên trình duyệt này</strong><p>Bài học, XP và lịch FSRS tự động ghi vào localStorage sau mỗi thao tác.</p></div>
          </div>
          <dl className="data-counters">
            <div><dt>Cảnh giới đã vượt</dt><dd>{Object.values(state.completedLessons).filter((item) => item.bestScore >= 70).length}</dd></div>
            <div><dt>Từ đã lưu</dt><dd>{state.savedWords.length}</dd></div>
            <div><dt>Thẻ FSRS</dt><dd>{Object.keys(state.fsrsCards).length}</dd></div>
            <div><dt>Lượt truy hồi</dt><dd>{state.reviewCount}</dd></div>
          </dl>
          <button className="secondary-button full-button" type="button" onClick={exportProgress}><Download size={17} /> Xuất bản sao JSON</button>
          <div className="danger-zone">
            <span>RESET PROTOCOL</span>
            <p>Thao tác này đưa hệ thống về lần khởi tạo đầu tiên trên thiết bị hiện tại.</p>
            <button type="button" onClick={() => setShowResetConfirm(true)}><RotateCcw size={17} /> Xóa tiến độ cục bộ</button>
          </div>
        </aside>
      </div>
      <ConfirmModal
        open={showResetConfirm}
        title="Đưa hệ thống về khởi nguyên?"
        description="Toàn bộ bài học, XP, lịch FSRS, lỗi sai và cấu hình đang lưu trên thiết bị này sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa toàn bộ dữ liệu"
        onConfirm={reset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
