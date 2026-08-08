import {
  BriefcaseBusiness,
  Award,
  AudioLines,
  Check,
  CircleUserRound,
  Cloud,
  Database,
  Download,
  LogIn,
  LogOut,
  Languages,
  MessageCircle,
  Plane,
  Radar,
  RotateCcw,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { useAudioEngine } from "../audio/AudioEngineProvider";
import { VoiceReactor } from "../components/system/VoiceReactor";
import { ConfirmModal, useSystemFeedback } from "../components/SystemFeedback";
import { RELEASED_WORD_BY_ID } from "../data/curriculum";
import { HSK_STARTING_LEVEL_OPTIONS } from "../data/hskLearningPaths";
import { getReleasedLessonProgress } from "../lib/adaptive";
import { chatGPTSignOutPath } from "../lib/chatgptAuthPaths";
import {
  createLearningRecoveryBundle,
  getAccountDeletionReadiness,
  serializeLearningStateSnapshot,
} from "../lib/learningRecoveryBundle";
import { parseLearningStateImport } from "../lib/learningStateImport";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { INITIAL_LEARNING_STATE, useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import {
  deriveJourneyTitles,
  getInteractionRankProgress,
  getSystemClass,
} from "../system/systemProgression";
import {
  useSystemUi,
  type SystemAnnouncementLevel,
  type SystemMotionMode,
  type SystemSoundPreset,
  type SystemVoiceProfile,
} from "../system/systemUiPreferences";
import type { LearningGoal, Profile } from "../types";

const goals: Array<{ id: LearningGoal; label: string; description: string; icon: typeof Target }> = [
  { id: "conversation", label: "Giao tiếp", description: "Ưu tiên nghe và nói đời sống", icon: MessageCircle },
  { id: "hsk", label: "Hướng tới HSK", description: "Ưu tiên kỹ năng nền, chưa cam kết luyện thi đầy đủ", icon: Target },
  { id: "career", label: "Công việc", description: "Ưu tiên ngôn ngữ chuyên nghiệp", icon: BriefcaseBusiness },
  { id: "travel", label: "Du lịch", description: "Ưu tiên tình huống sinh tồn", icon: Plane },
];

const startingLevels = HSK_STARTING_LEVEL_OPTIONS.map((item) => ({
  id: item.id,
  label: item.title,
}));

const dailyMinuteOptions = [10, 20, 30] as const;
const scriptOptions = ["simplified", "traditional"] as const;
const motionModes: Array<{ id: SystemMotionMode; label: string; description: string }> = [
  { id: "auto", label: "Tự động", description: "Theo thiết bị và tùy chọn giảm chuyển động." },
  { id: "balanced", label: "Cân bằng", description: "Chiều sâu rõ, ít chuyển động nền." },
  { id: "cinematic", label: "Điện ảnh", description: "Nghi thức và không gian đầy đủ hơn." },
  { id: "reduced", label: "Giảm chuyển động", description: "Tắt tilt, parallax và chuyển động nền lặp lại." },
];
const soundPresets: Array<{ id: SystemSoundPreset; label: string }> = [
  { id: "quiet", label: "Ẩn hành" },
  { id: "balanced", label: "Cân bằng" },
  { id: "awakening", label: "Thức tỉnh" },
];
const voiceProfiles: Array<{ id: SystemVoiceProfile; label: string }> = [
  { id: "mechanical", label: "Cơ Linh · Mechanical Core" },
  { id: "oracle", label: "Thiên cơ · trầm tĩnh" },
  { id: "executor", label: "Chấp hành · uy nghiêm" },
  { id: "guide", label: "Dẫn lộ · sáng rõ" },
];
const announcementLevels: Array<{ id: SystemAnnouncementLevel; label: string }> = [
  { id: "off", label: "Không tự thông báo" },
  { id: "ceremonial", label: "Chỉ nghi thức lớn" },
  { id: "full", label: "Phản ứng đầy đủ" },
];
const MAX_RECOVERY_FILE_BYTES = 8_000_000;

export function ProfilePage() {
  const { state, actions, level, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const { notify } = useSystemFeedback();
  const {
    preferences,
    setMotionMode,
    setSoundEnabled,
    setSoundVolume,
    setEffectsVolume,
    setSoundPreset,
    setVoiceEnabled,
    setVoiceVolume,
    setVoiceProfile,
    setPreferredVoiceUri,
    setAnnouncementLevel,
    replayCeremonies,
  } = useSystemUi();
  const {
    announce,
    hasVietnameseDeviceVoice,
    playback,
    previewCue,
    voices,
  } = useAudioEngine();
  const vietnameseVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("vi"));
  const selectedVoiceProfile = voiceProfiles.find((profile) => profile.id === preferences.voiceProfile)
    ?? voiceProfiles[0];
  const [draft, setDraft] = useState<Profile>(state.profile);
  const [saved, setSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportedSnapshot, setExportedSnapshot] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const localProgress = getReleasedLessonProgress(state);
  const completedCount = sync.session?.authenticated
    ? normalized.authoritativeProgress?.completedCount ?? null
    : localProgress.completedCount;
  const rank = getInteractionRankProgress(state.xp);
  const systemClass = getSystemClass(draft.goal);
  const journeyTitle = deriveJourneyTitles(state.completedLessons)
    .filter((item) => item.completed)
    .at(-1)?.title ?? "Hành Giả Sơ Khởi";
  const currentSnapshot = serializeLearningStateSnapshot(state);
  const deletionReadiness = getAccountDeletionReadiness({
    authenticated: sync.session?.authenticated === true,
    syncPhase: sync.phase,
    pendingCount: sync.pendingCount,
    normalizedPendingCount: sync.normalizedPendingCount,
    normalizedQuarantinedCount: sync.normalizedQuarantinedCount,
    currentSnapshot,
    exportedSnapshot,
  });

  const updateDraft = (patch: Partial<Profile>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const save = () => {
    actions.updateProfile({ ...draft, name: draft.name.trim() || "Hành giả vô danh" });
    setSaved(true);
    notify("Cấu hình hành trình đã được lưu trên thiết bị này.");
  };

  const exportProgress = () => {
    const bundle = createLearningRecoveryBundle({
      state,
      syncPhase: sync.phase,
      pendingCount: sync.pendingCount,
      normalizedPendingCount: sync.normalizedPendingCount,
      normalizedQuarantinedCount: sync.normalizedQuarantinedCount,
    });
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hanzi-os-recovery-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setExportedSnapshot(currentSnapshot);
    notify(
      sync.normalizedQuarantinedCount > 0
        ? `Đã tạo bản phục hồi; bản này chỉ ghi số lượng ${sync.normalizedQuarantinedCount} lệnh học bị cách ly và không tự xóa chúng.`
        : sync.normalizedPendingCount > 0
          ? `Đã tạo bản phục hồi; ${sync.normalizedPendingCount} lệnh học chuẩn hóa vẫn chờ máy chủ xác nhận.`
          : sync.pendingCount > 0
        ? `Đã tạo bản phục hồi gồm cả ${sync.pendingCount} thay đổi cục bộ đang chờ.`
        : "Đã tạo bản phục hồi của trạng thái hiện tại trên thiết bị.",
    );
  };

  const exportCloudSnapshot = () => {
    window.location.assign("/api/account/export");
  };

  const reset = async () => {
    setShowResetConfirm(false);
    if (await actions.resetProgress()) {
      notify(
        sync.session?.authenticated
          ? "Lệnh đặt lại đã được lưu an toàn và sẽ đồng bộ với tài khoản."
          : "Dữ liệu học trên thiết bị đã được đưa về trạng thái khởi nguyên.",
        "warning",
      );
    } else {
      notify("Không thể xác nhận lệnh đặt lại đã được lưu bền. Hãy kiểm tra trạng thái lưu trữ trước khi thử lại.", "warning");
    }
  };

  const importProgress = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_RECOVERY_FILE_BYTES) {
      notify("Bản sao vượt giới hạn 8 MB của closed alpha.", "warning");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const result = parseLearningStateImport(parsed, INITIAL_LEARNING_STATE);
      if (!result.ok) {
        notify(result.error, "warning");
        return;
      }
      if (!await actions.importProgress(result.state)) {
        notify("Không thể xác nhận bản phục hồi đã được lưu bền. Hãy kiểm tra trạng thái đồng bộ trước khi thử lại.", "warning");
        return;
      }
      setExportedSnapshot(null);
      setDraft(result.state.profile);
      notify(
        sync.session?.authenticated
          ? "Đã phục hồi bản sao và xếp hàng để hòa giải với tài khoản."
          : "Đã phục hồi bản sao trên thiết bị này.",
      );
    } catch {
      notify("Tệp không phải bản sao JSON hợp lệ của HANZI.OS.", "warning");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const syncNow = async () => {
    await actions.syncNow();
    notify("Đã kiểm tra hàng đợi đồng bộ.");
  };

  const signOut = async () => {
    try {
      await actions.prepareSignOut();
      await fetch("/api/auth/signout", { method: "POST" });
      window.location.assign(chatGPTSignOutPath("/"));
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Không thể đăng xuất an toàn lúc này.",
        "warning",
      );
    }
  };

  const deleteAccount = async () => {
    setShowDeleteConfirm(false);
    if (!deletionReadiness.ready) {
      notify(deletionReadinessLabel, "warning");
      return;
    }
    try {
      await actions.deleteAccount();
      notify("Tài khoản cloud và dữ liệu máy chủ đã được xóa.", "warning");
      window.location.assign(chatGPTSignOutPath("/"));
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Không thể xóa tài khoản lúc này.",
        "warning",
      );
    }
  };

  const syncLabel = sync.phase === "syncing"
    ? "Đang đồng bộ"
    : sync.phase === "synced"
      ? "Đã đồng bộ"
      : sync.phase === "offline"
        ? "Ngoại tuyến · đang xếp hàng"
        : sync.phase === "error"
          ? "Đồng bộ cần thử lại"
          : sync.phase === "checking"
            ? "Đang kiểm tra phiên"
            : "Chỉ lưu trên thiết bị";

  const deletionReadinessLabel = deletionReadiness.ready
    ? "Đã đồng bộ sạch và có bản phục hồi hiện tại."
    : deletionReadiness.reason === "quarantined-normalized-commands"
      ? `Có ${sync.normalizedQuarantinedCount} lệnh học chuẩn hóa bị cách ly. Chúng không bị tự bỏ; hãy xử lý hoặc đặt lại dữ liệu rõ ràng trước.`
      : deletionReadiness.reason === "pending-normalized-commands"
        ? `Còn ${sync.normalizedPendingCount} lệnh học chuẩn hóa chưa được máy chủ xác nhận.`
        : deletionReadiness.reason === "pending-sync"
      ? `Còn ${sync.pendingCount} thay đổi chưa lên cloud. Hãy đồng bộ trước.`
      : deletionReadiness.reason === "not-synced"
        ? "Cần hoàn tất đồng bộ cloud trước khi xóa tài khoản."
        : "Hãy xuất bản phục hồi của trạng thái hiện tại trước khi xóa.";

  const syncQueueLabel = [
    sync.pendingCount > 0 ? `${sync.pendingCount} thay đổi tương thích đang chờ` : null,
    sync.normalizedPendingCount > 0
      ? `${sync.normalizedPendingCount} lệnh học chuẩn hóa đang chờ`
      : null,
    sync.normalizedQuarantinedCount > 0
      ? `${sync.normalizedQuarantinedCount} lệnh học bị cách ly`
      : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="content-page profile-page">
      <header className="page-hero profile-hero">
        <div>
          <span className="system-kicker"><CircleUserRound size={15} /> BẢNG THUỘC TÍNH · HỒ SƠ HÀNH GIẢ</span>
          <h1>Bảng Thuộc Tính</h1>
          <p>Điều chỉnh Thiên Mệnh, Nhịp Tu Luyện, hiệu ứng hệ thống và dữ liệu cá nhân đang lưu trên thiết bị.</p>
        </div>
        <div className="profile-rank-badge"><span>CẤP HỆ THỐNG</span><strong>{String(level).padStart(2, "0")}</strong><small>{rank.title} · {state.xp} XP tương tác</small></div>
      </header>

      <div className="profile-layout">
        <section className="profile-settings">
          <header className="section-heading"><div><span>HỒ SƠ HÀNH GIẢ</span><h2>Cấu hình hành trình</h2></div><Languages size={21} /></header>
          <div className="sys-profile-identity" aria-label="Danh hiệu nội bộ HANZI.OS">
            <Award size={22} />
            <span><small>CHỨC HỆ ĐỊNH HƯỚNG</small><strong>{systemClass.title}</strong><em>{systemClass.plain}</em></span>
            <span><small>DANH HIỆU HÀNH TRÌNH</small><strong>{journeyTitle}</strong><em>Danh hiệu động lực trong HANZI.OS.</em></span>
          </div>
          <label className="field-label">
            <span>Tên hiển thị</span>
            <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} maxLength={40} />
          </label>
          <fieldset className="profile-fieldset">
            <legend id="profile-goal-legend">Thiên Mệnh · mục tiêu chính</legend>
            <div
              className="goal-option-grid"
              role="radiogroup"
              aria-labelledby="profile-goal-legend"
            >
              {goals.map(({ id, label, description, icon: Icon }, optionIndex) => (
                <button
                  className={draft.goal === id ? "active" : ""}
                  data-radio-index={optionIndex}
                  key={id}
                  role="radio"
                  aria-checked={draft.goal === id}
                  tabIndex={draft.goal === id ? 0 : -1}
                  type="button"
                  onClick={() => updateDraft({ goal: id })}
                  onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                    currentIndex: optionIndex,
                    itemCount: goals.length,
                    onSelect: (nextIndex) => updateDraft({
                      goal: goals[nextIndex]!.id,
                    }),
                  })}
                >
                  <Icon size={19} /><span><strong>{label}</strong><small>{description}</small></span>{draft.goal === id && <Check size={17} />}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="profile-fieldset inline-fieldset">
            <legend id="profile-daily-minutes-legend">Nhịp Tu Luyện · thời lượng mỗi ngày</legend>
            <div
              className="segmented-control"
              role="radiogroup"
              aria-labelledby="profile-daily-minutes-legend"
            >
              {dailyMinuteOptions.map((minutes, optionIndex) => (
                <button
                  className={draft.dailyMinutes === minutes ? "active" : ""}
                  data-radio-index={optionIndex}
                  key={minutes}
                  role="radio"
                  aria-checked={draft.dailyMinutes === minutes}
                  tabIndex={draft.dailyMinutes === minutes ? 0 : -1}
                  type="button"
                  onClick={() => updateDraft({ dailyMinutes: minutes })}
                  onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                    currentIndex: optionIndex,
                    itemCount: dailyMinuteOptions.length,
                    onSelect: (nextIndex) => updateDraft({
                      dailyMinutes: dailyMinuteOptions[nextIndex]!,
                    }),
                  })}
                >
                  {minutes} phút
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="profile-fieldset inline-fieldset">
            <legend id="profile-starting-level-legend">Căn Cơ Tự Khai · không miễn bài tiên quyết</legend>
            <div
              className="segmented-control starting-control"
              role="radiogroup"
              aria-labelledby="profile-starting-level-legend"
            >
              {startingLevels.map((item, optionIndex) => (
                <button
                  className={draft.startingLevel === item.id ? "active" : ""}
                  data-radio-index={optionIndex}
                  key={item.id}
                  role="radio"
                  aria-checked={draft.startingLevel === item.id}
                  tabIndex={draft.startingLevel === item.id ? 0 : -1}
                  type="button"
                  onClick={() => updateDraft({ startingLevel: item.id })}
                  onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                    currentIndex: optionIndex,
                    itemCount: startingLevels.length,
                    onSelect: (nextIndex) => updateDraft({
                      startingLevel: startingLevels[nextIndex]!.id,
                    }),
                  })}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Link className="assessment-inline-link" to="/assessment"><Radar size={16} /> Khảo sát để nhận gợi ý luyện</Link>
          </fieldset>
          <fieldset className="profile-fieldset inline-fieldset">
            <legend id="profile-script-legend">Hệ chữ ưu tiên</legend>
            <div
              className="segmented-control script-control"
              role="radiogroup"
              aria-labelledby="profile-script-legend"
            >
              <button
                className={draft.script === "simplified" ? "active" : ""}
                data-radio-index={0}
                role="radio"
                aria-checked={draft.script === "simplified"}
                tabIndex={draft.script === "simplified" ? 0 : -1}
                type="button"
                onClick={() => updateDraft({ script: "simplified" })}
                onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                  currentIndex: 0,
                  itemCount: scriptOptions.length,
                  onSelect: (nextIndex) => updateDraft({
                    script: scriptOptions[nextIndex]!,
                  }),
                })}
              >
                简体 · Giản thể
              </button>
              <button
                className={draft.script === "traditional" ? "active" : ""}
                data-radio-index={1}
                role="radio"
                aria-checked={draft.script === "traditional"}
                tabIndex={draft.script === "traditional" ? 0 : -1}
                type="button"
                onClick={() => updateDraft({ script: "traditional" })}
                onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                  currentIndex: 1,
                  itemCount: scriptOptions.length,
                  onSelect: (nextIndex) => updateDraft({
                    script: scriptOptions[nextIndex]!,
                  }),
                })}
              >
                繁體 · Phồn thể
              </button>
            </div>
          </fieldset>
          <fieldset className="profile-fieldset">
            <legend id="profile-motion-legend">Cường độ hiệu ứng hệ thống</legend>
            <div className="sys-motion-options" role="radiogroup" aria-labelledby="profile-motion-legend">
              {motionModes.map((mode) => (
                <button
                  className={preferences.motionMode === mode.id ? "active" : ""}
                  key={mode.id}
                  role="radio"
                  aria-checked={preferences.motionMode === mode.id}
                  type="button"
                  onClick={() => setMotionMode(mode.id)}
                >
                  <Sparkles size={17} />
                  <span><strong>{mode.label}</strong><small>{mode.description}</small></span>
                  {preferences.motionMode === mode.id && <Check size={16} />}
                </button>
              ))}
            </div>
            <button className="sys-replay-button" type="button" onClick={() => {
              replayCeremonies();
              notify("Các nghi thức nội bộ sẽ được phép hiển thị lại khi bạn trở về Thức Tỉnh Điện.", "info");
            }}>
              <Sparkles size={16} /> Cho phép xem lại nghi thức
            </button>
          </fieldset>
          <fieldset className="profile-fieldset">
            <legend>Giao thức âm thanh hệ thống</legend>
            <div className="sys-audio-console">
              <div className="sys-voice-identity">
                <span aria-hidden="true"><AudioLines size={22} /></span>
                <div>
                  <small>VOICE CHANNEL · LOCAL SYNTHETIC</small>
                  <strong>{selectedVoiceProfile.label}</strong>
                </div>
                <b>{selectedVoiceProfile.id === "mechanical" ? "ORIGINAL V1" : "FALLBACK V2"}</b>
              </div>
              <button
                className={preferences.soundEnabled ? "active" : ""}
                type="button"
                aria-pressed={preferences.soundEnabled}
                data-system-silent="true"
                onClick={() => {
                  const enabled = !preferences.soundEnabled;
                  setSoundEnabled(enabled);
                  if (enabled) previewCue("system.boot");
                }}
              >
                {preferences.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                <span>
                  <strong>Âm phản hồi · {preferences.soundEnabled ? "Đang bật" : "Đang tắt"}</strong>
                  <small>Âm ngắn khi triệu hồi, điều hướng, xác nhận và đạt ngưỡng.</small>
                </span>
                <i aria-hidden="true" />
              </button>
              <label className={preferences.soundEnabled ? "" : "disabled"}>
                <span><strong>Cường độ âm</strong><output>{Math.round(preferences.soundVolume * 100)}%</output></span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={preferences.soundVolume}
                  disabled={!preferences.soundEnabled}
                  onChange={(event) => setSoundVolume(Number(event.target.value))}
                  onPointerUp={() => previewCue("ui.select")}
                  aria-label="Cường độ âm thanh hệ thống"
                />
              </label>
              <label className={preferences.soundEnabled ? "" : "disabled"}>
                <span><strong>Hiệu ứng phản ứng</strong><output>{Math.round(preferences.effectsVolume * 100)}%</output></span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={preferences.effectsVolume}
                  disabled={!preferences.soundEnabled}
                  onChange={(event) => setEffectsVolume(Number(event.target.value))}
                  onPointerUp={() => previewCue("quest.activated")}
                  aria-label="Cường độ hiệu ứng phản ứng"
                />
              </label>
              <label>
                <span><strong>Phổ âm</strong><output>{soundPresets.find((item) => item.id === preferences.soundPreset)?.label}</output></span>
                <select value={preferences.soundPreset} onChange={(event) => setSoundPreset(event.target.value as SystemSoundPreset)}>
                  {soundPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                </select>
              </label>
              <button
                className={preferences.voiceEnabled ? "active voice" : "voice"}
                type="button"
                aria-pressed={preferences.voiceEnabled}
                onClick={() => setVoiceEnabled(!preferences.voiceEnabled)}
              >
                <AudioLines size={20} />
                <span>
                  <strong>Giọng hệ thống · {preferences.voiceEnabled ? "Đã thức tỉnh" : "Đang ngủ"}</strong>
                  <small>{selectedVoiceProfile.label} đang giữ kênh xướng lệnh.</small>
                </span>
                <i aria-hidden="true" />
              </button>
              <label className={preferences.voiceEnabled ? "" : "disabled"}>
                <span><strong>Âm lượng xướng lệnh</strong><output>{Math.round(preferences.voiceVolume * 100)}%</output></span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={preferences.voiceVolume}
                  disabled={!preferences.voiceEnabled}
                  onChange={(event) => setVoiceVolume(Number(event.target.value))}
                  aria-label="Âm lượng giọng hệ thống"
                />
              </label>
              <label>
                <span><strong>Nhân cách xướng lệnh</strong><output>Local</output></span>
                <select aria-label="Nhân cách xướng lệnh" value={preferences.voiceProfile} onChange={(event) => setVoiceProfile(event.target.value as SystemVoiceProfile)}>
                  {voiceProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
                </select>
              </label>
              <label>
                <span><strong>Cấp độ thông báo</strong></span>
                <select value={preferences.announcementLevel} onChange={(event) => setAnnouncementLevel(event.target.value as SystemAnnouncementLevel)}>
                  {announcementLevels.map((levelOption) => <option key={levelOption.id} value={levelOption.id}>{levelOption.label}</option>)}
                </select>
              </label>
              <label className={hasVietnameseDeviceVoice ? "" : "disabled"}>
                <span><strong>TTS thiết bị cho câu động</strong></span>
                <select
                  value={preferences.preferredVoiceUri ?? ""}
                  disabled={!hasVietnameseDeviceVoice}
                  onChange={(event) => setPreferredVoiceUri(event.target.value || undefined)}
                >
                  <option value="">Tự chọn giọng dự phòng</option>
                  {vietnameseVoices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>)}
                </select>
              </label>
              <button
                className="sys-audio-test"
                type="button"
                data-system-silent="true"
                onClick={() => {
                  previewCue("system.online");
                  const played = announce("Hệ thống đã kết nối. Kênh xướng lệnh sẵn sàng.", {
                    sourceId: "profile:voice-preview",
                    force: true,
                    priority: 3,
                    clipId: "profile.preview",
                  });
                  if (!played) notify("Kênh xướng lệnh hiện chưa thể phát.", "info");
                }}
              >
                <Sparkles size={16} /> Nghe thử giọng đang chọn
              </button>
              <VoiceReactor sourceId="profile:voice-preview" phase={playback.sourceId === "profile:voice-preview" ? playback.phase : "idle"} compact />
              <small className="sys-audio-disclosure">Các nhân cách dùng giọng máy tổng hợp để xướng lệnh và hỗ trợ tự học trên thiết bị.</small>
            </div>
          </fieldset>
          <button className="primary-button profile-save" type="button" onClick={save}>{saved ? <Check size={18} /> : <Save size={18} />}{saved ? "Đã lưu cấu hình" : "Lưu cấu hình"}</button>
        </section>

        <aside className="data-control-panel">
          <header className="section-heading"><div><span>DURABLE DATA VAULT</span><h2>Kho dữ liệu</h2></div><Database size={21} /></header>
          <div className={`cloud-account-card ${sync.session?.authenticated ? "authenticated" : "anonymous"}`}>
            <Cloud size={23} />
            <div>
              <strong>{sync.session?.authenticated ? sync.session.user.displayName : "Chưa kết nối tài khoản"}</strong>
              <p>{sync.session?.authenticated ? sync.session.user.email : "Tiến độ vẫn hoạt động ngoại tuyến trên thiết bị này."}</p>
              <small>{syncLabel}{syncQueueLabel ? ` · ${syncQueueLabel}` : ""}</small>
            </div>
            {sync.session?.authenticated ? (
              <button type="button" onClick={signOut}><LogOut size={16} /> Đăng xuất</button>
            ) : (
              <a href="/signin"><LogIn size={16} /> Đăng nhập</a>
            )}
          </div>
          {sync.session?.authenticated && (
            <a className="secondary-button full-button admin-gateway-link" href="/account/security">
              <ShieldCheck size={17} /> Bảo mật tài khoản và phiên
            </a>
          )}
          {sync.session?.authenticated && (
            <a className="secondary-button full-button admin-gateway-link" href="/admin">
              <ShieldCheck size={17} /> Kiểm tra Cổng Quản Trị
            </a>
          )}
          <div className="data-status">
            <ShieldCheck size={24} />
            <div>
              <strong>{sync.session?.authenticated ? "Local-first và có bản sao cloud" : "Dữ liệu nằm trên trình duyệt này"}</strong>
              <p>{sync.session?.authenticated ? "Mỗi thao tác được ghi cục bộ trước, xếp hàng khi mất mạng và hòa giải theo idempotency khi kết nối lại." : "Bài học, XP và lịch FSRS được lưu cục bộ; đăng nhập để phục hồi trên thiết bị khác."}</p>
            </div>
          </div>
          <dl className="data-counters">
            <div><dt>Thử Luyện đã thông qua</dt><dd>{completedCount ?? "—"}</dd></div>
            <div><dt>Từ đã lưu</dt><dd>{state.savedWords.filter((wordId) => RELEASED_WORD_BY_ID.has(wordId)).length}</dd></div>
            <div><dt>Thẻ FSRS</dt><dd>{Object.keys(state.fsrsCards).filter((wordId) => RELEASED_WORD_BY_ID.has(wordId)).length}</dd></div>
            <div><dt>Lượt truy hồi</dt><dd>{state.reviewCount}</dd></div>
          </dl>
          {sync.session?.authenticated && (
            <button className="secondary-button full-button" type="button" onClick={syncNow} disabled={sync.phase === "syncing"}>
              <RefreshCw className={sync.phase === "syncing" ? "spin" : ""} size={17} /> {sync.phase === "syncing" ? "Đang đồng bộ..." : "Đồng bộ ngay"}
            </button>
          )}
          <button className="secondary-button full-button" type="button" onClick={exportProgress}><Download size={17} /> Xuất bản phục hồi hiện tại</button>
          {sync.session?.authenticated && (
            <button className="secondary-button full-button" type="button" onClick={exportCloudSnapshot}><Cloud size={17} /> Xuất snapshot cloud đã xác nhận</button>
          )}
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importProgress(event.target.files?.[0])}
          />
          <button className="secondary-button full-button" type="button" onClick={() => importInputRef.current?.click()}><Upload size={17} /> Phục hồi từ bản sao JSON</button>
          <div className="danger-zone">
            <span>RESET PROTOCOL</span>
            <p>{sync.session?.authenticated ? "Đặt lại tiến độ học trên tài khoản; lệnh vẫn an toàn khi ngoại tuyến và sẽ gửi khi có mạng." : "Đưa tiến độ học trên thiết bị này về lần khởi tạo đầu tiên."}</p>
            <button type="button" onClick={() => setShowResetConfirm(true)}><RotateCcw size={17} /> Xóa toàn bộ dữ liệu HANZI.OS</button>
            {sync.session?.authenticated && (
              <>
                <small className="account-delete-readiness" role="status">
                  {deletionReadinessLabel}
                </small>
                <button
                  className="account-delete-button"
                  type="button"
                  disabled={!deletionReadiness.ready}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={17} /> Xóa tài khoản và dữ liệu máy chủ
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
      <ConfirmModal
        open={showResetConfirm}
        title="Đưa hệ thống về khởi nguyên?"
        description={sync.session?.authenticated ? "Tiến độ, phiên đang dở và cấu hình học sẽ được đặt lại trên tài khoản sau khi hàng đợi đồng bộ được xác nhận. Tài khoản đăng nhập không bị xóa." : "Tiến độ, phiên đang dở, cấu hình, đồng ý giọng nói và cache HANZI.OS trên thiết bị này sẽ bị xóa. Không thể hoàn tác."}
        confirmLabel="Xóa toàn bộ dữ liệu"
        onConfirm={reset}
        onCancel={() => setShowResetConfirm(false)}
      />
      <ConfirmModal
        open={showDeleteConfirm}
        title="Xóa vĩnh viễn tài khoản HANZI.OS?"
        description="Dữ liệu học đã đồng bộ trên máy chủ sẽ bị xóa. Bản phục hồi hiện tại trên thiết bị đã được tạo; thao tác này không thể hoàn tác."
        confirmLabel="Xóa tài khoản và dữ liệu"
        onConfirm={deleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
