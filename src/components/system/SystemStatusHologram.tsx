import {
  Activity,
  AudioLines,
  BrainCircuit,
  ChevronRight,
  CircleGauge,
  Flame,
  Map,
  Orbit,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, type CSSProperties, type RefObject } from "react";
import { Link } from "react-router";
import { useAudioEngine } from "../../audio/AudioEngineProvider";
import {
  getNextLesson,
  getReleasedLessonProgress,
  isMistakeFromActivePathContent,
} from "../../lib/adaptive";
import {
  deriveJourneyTitles,
  getInteractionRankProgress,
  getSystemClass,
} from "../../system/systemProgression";
import { useSystemUi } from "../../system/systemUiPreferences";
import { emitSystemSignal } from "../../system/systemSignals";
import { useLearning } from "../../store/LearningStore";
import { useInteractionXp } from "../../store/InteractionXpStore";
import type { Skill } from "../../types";

const SKILL_LABELS: Record<Skill, { code: string; label: string }> = {
  pronunciation: { code: "ÂM", label: "Phát âm" },
  listening: { code: "THÍNH", label: "Nghe" },
  speaking: { code: "KHẨU", label: "Nói" },
  reading: { code: "ĐỘC", label: "Đọc" },
  writing: { code: "BÚT", label: "Viết" },
  vocabulary: { code: "TỪ", label: "Từ vựng" },
  grammar: { code: "PHÁP", label: "Ngữ pháp" },
};

type SystemStatusHologramProps = {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

export function SystemStatusHologram({ open, onClose, returnFocusRef }: SystemStatusHologramProps) {
  const { state, dueWordIds, level } = useLearning();
  const interactionXp = useInteractionXp();
  const {
    preferences,
    resolvedMotion,
    setSoundEnabled,
  } = useSystemUi();
  const { announce, playCue, previewCue } = useAudioEngine();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const closeSignalRef = useRef(() => emitSystemSignal({ type: "system.panel-closed", sourceId: "status:keyboard" }));
  const titleId = useId();
  const descriptionId = useId();
  const rank = getInteractionRankProgress(interactionXp.totalXp);
  const displayedLevel = interactionXp.authoritative
    ? Math.floor(interactionXp.totalXp / 500) + 1
    : level;
  const systemClass = getSystemClass(state.profile.goal);
  const progress = getReleasedLessonProgress(state);
  const nextLesson = getNextLesson(state);
  const journeyTitle = deriveJourneyTitles(state.completedLessons)
    .filter((item) => item.completed)
    .at(-1)?.title ?? "Hành Giả Sơ Khởi";
  const unresolvedMistakes = state.mistakes.filter((mistake) =>
    !mistake.resolved && isMistakeFromActivePathContent(mistake, state.profile.startingLevel)
  ).length;
  const skills = useMemo(() => Object.entries(state.skillMastery) as Array<[Skill, number]>, [state.skillMastery]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocusElement = returnFocusRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSignalRef.current();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      returnFocusElement?.focus({ preventScroll: true });
    };
  }, [onClose, open, returnFocusRef]);

  if (!open) return null;

  const close = () => {
    emitSystemSignal({ type: "system.panel-closed", sourceId: "status:panel" });
    onClose();
  };

  const updatePerspective = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resolvedMotion === "reduced" || event.pointerType === "touch") return;
    const scene = sceneRef.current;
    if (!scene) return;
    const bounds = scene.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      scene.style.setProperty("--holo-rotate-x", `${(-y * 8).toFixed(2)}deg`);
      scene.style.setProperty("--holo-rotate-y", `${(x * 12).toFixed(2)}deg`);
      scene.style.setProperty("--holo-shift-x", `${(x * 16).toFixed(2)}px`);
      scene.style.setProperty("--holo-shift-y", `${(y * 10).toFixed(2)}px`);
    });
  };

  const resetPerspective = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.style.setProperty("--holo-rotate-x", "0deg");
    scene.style.setProperty("--holo-rotate-y", "0deg");
    scene.style.setProperty("--holo-shift-x", "0px");
    scene.style.setProperty("--holo-shift-y", "0px");
  };

  const toggleSound = () => {
    if (!preferences.soundEnabled) {
      setSoundEnabled(true);
      previewCue("system.open");
    } else {
      playCue("system.close");
      setSoundEnabled(false);
    }
  };

  const announceStatus = () => {
    playCue("ui.confirm");
    announce(
      "Đồng bộ hồ sơ hoàn tất. Bảng trạng thái đã sẵn sàng.",
      { sourceId: "status:announcer", priority: 2, clipId: "status.summary" },
    );
  };

  return (
    <div
      className="sys-holo-scrim"
      data-motion={resolvedMotion}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        ref={dialogRef}
        className="sys-holo-console"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="sys-holo-projection-beam" aria-hidden="true" />
        <div className="sys-holo-scanline" aria-hidden="true" />
        <header className="sys-holo-command">
          <div className="sys-holo-online" role="status">
            <Radio size={15} />
            <span><small>NEURAL LINK · LOCAL CORE</small><strong>HỆ THỐNG ĐÃ KẾT NỐI</strong></span>
          </div>
          <div className="sys-holo-actions">
            <button
              type="button"
              className={preferences.soundEnabled ? "active" : ""}
              onClick={toggleSound}
              data-system-silent="true"
              aria-pressed={preferences.soundEnabled}
              aria-label={preferences.soundEnabled ? "Tắt âm thanh hệ thống" : "Bật âm thanh hệ thống"}
              title={preferences.soundEnabled ? "Tắt âm hệ thống" : "Bật âm hệ thống"}
            >
              {preferences.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              data-system-silent="true"
              aria-label="Thu hồi Bảng Hệ Thống"
              title="Thu hồi · Esc"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div
          ref={sceneRef}
          className="sys-holo-scene"
          onPointerMove={updatePerspective}
          onPointerLeave={resetPerspective}
        >
          <div className="sys-holo-orbital-field" aria-hidden="true">
            <i /><i /><i />
            <span>觉</span>
          </div>

          <aside className="sys-holo-wing sys-holo-wing-left" aria-label="Nhiệm vụ đang hoạt động">
            <span className="sys-holo-panel-code"><Target size={14} /> ACTIVE DIRECTIVE</span>
            <h3>Nhiệm vụ hiện tại</h3>
            {nextLesson ? (
              <div className="sys-holo-mission">
                <small>THỬ LUYỆN KẾ TIẾP</small>
                <strong>{nextLesson.title}</strong>
                <p>{nextLesson.objective}</p>
                <span>{nextLesson.minutes} phút · +{nextLesson.xp} XP tương tác</span>
              </div>
            ) : (
              <div className="sys-holo-mission"><strong>Thiên Lộ hiện tại đã hoàn tất</strong><p>Mở Thiên Lộ để chọn chặng ôn tiếp theo.</p></div>
            )}
            <dl className="sys-holo-alerts">
              <div><dt><BrainCircuit size={14} /> Mảnh ký ức đến hạn</dt><dd>{dueWordIds.length}</dd></div>
              <div><dt><Activity size={14} /> Nghịch cảnh còn mở</dt><dd>{unresolvedMistakes}</dd></div>
              <div><dt><Flame size={14} /> Chuỗi duy trì</dt><dd>{state.streak} ngày</dd></div>
            </dl>
          </aside>

          <article
            className="sys-holo-status-card"
            style={{ "--rank-progress": `${rank.progress * 3.6}deg` } as CSSProperties}
          >
            <div className="sys-holo-card-depth" aria-hidden="true" />
            <div className="sys-holo-rank-orbit" aria-hidden="true"><i /><b /><span /></div>
            <div className="sys-holo-avatar" aria-hidden="true"><span>{displayedLevel}</span><small>境</small></div>
            <span className="sys-holo-id">STATUS WINDOW · HZ-{state.profile.goal.toUpperCase()}-{String(progress.completedCount).padStart(3, "0")}</span>
            <h2 id={titleId}>{state.profile.name}</h2>
            <p className="sys-holo-class">{systemClass.title}</p>
            <div className="sys-holo-title-seal"><ShieldCheck size={15} /><span>Danh hiệu</span><strong>{journeyTitle}</strong></div>
            <div className="sys-holo-rank-line">
              <span><small>CẢNH GIỚI HOẠT ĐỘNG</small><strong>{rank.chinese} · {rank.title}</strong></span>
              <b>{rank.progress}%</b>
            </div>
            <div className="sys-holo-rank-track"><i style={{ width: `${rank.progress}%` }} /></div>
            <div className="sys-holo-core-stats">
              <div><Zap size={16} /><span><small>NĂNG LƯỢNG TƯƠNG TÁC</small><strong>{interactionXp.pending ? "ĐANG ĐỒNG BỘ" : `${interactionXp.totalXp.toLocaleString("vi-VN")} XP`}</strong></span></div>
              <div><CircleGauge size={16} /><span><small>THỬ LUYỆN THÔNG QUA</small><strong>{progress.completedCount}/{progress.totalCount}</strong></span></div>
            </div>
            <p className="sys-holo-truth" id={descriptionId}>XP, danh hiệu và chỉ số dưới đây là tín hiệu học tập nội bộ; không thay thế chứng nhận HSK hay tự suy ra năng lực nói.</p>
          </article>

          <aside className="sys-holo-wing sys-holo-wing-right" aria-label="Chỉ số học tập quan sát được">
            <span className="sys-holo-panel-code"><CircleGauge size={14} /> OBSERVED SIGNALS</span>
            <h3>Ma trận thuộc tính</h3>
            <div className="sys-holo-skills">
              {skills.map(([skill, value]) => (
                <div key={skill}>
                  <span><b>{SKILL_LABELS[skill].code}</b><small>{SKILL_LABELS[skill].label}</small></span>
                  <i><b style={{ width: `${value}%` }} /></i>
                  <strong>{Math.round(value)}</strong>
                </div>
              ))}
            </div>
            <div className="sys-holo-path-progress">
              <span><Map size={15} /> Thiên Lộ quan sát</span>
              <strong>{progress.progress}%</strong>
              <i><b style={{ width: `${progress.progress}%` }} /></i>
            </div>
          </aside>
        </div>

        <footer className="sys-holo-footer">
          <div><Orbit size={15} /><span><small>SUMMON PROTOCOL</small><strong>Alt + S để triệu hồi ở mọi điện</strong></span></div>
          <nav aria-label="Lệnh nhanh từ Bảng Hệ Thống">
            {preferences.voiceEnabled ? (
              <button type="button" onClick={announceStatus} data-system-silent="true"><AudioLines size={16} /> Phát giọng hệ thống</button>
            ) : (
              <Link to="/profile" onClick={onClose}><AudioLines size={16} /> Mở giọng tổng hợp</Link>
            )}
            <Link to="/path" onClick={onClose}><Map size={16} /> Mở Thiên Lộ</Link>
            {nextLesson && (
              <Link className="primary" to={`/lesson/${nextLesson.id}`} onClick={onClose}>
                Khởi động Thử Luyện <ChevronRight size={16} />
              </Link>
            )}
          </nav>
        </footer>
        <Sparkles className="sys-holo-corner-glyph" aria-hidden="true" />
      </section>
    </div>
  );
}
