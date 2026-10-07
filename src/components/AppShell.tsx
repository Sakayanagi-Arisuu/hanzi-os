import {
  BarChart3,
  BookOpenText,
  BrainCircuit,
  ChevronRight,
  Crown,
  Gauge,
  Languages,
  LayoutGrid,
  Map,
  Mic2,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  Search,
  Settings,
  ShieldCheck,
  Swords,
  Target,
  Volume2,
  X,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  resolvePlacementResumeDestination,
  type PlacementResumeDestination,
} from "../assessment/placementResume";
import { hasLearningProgress } from "../assessment/placementSafety";
import { usePlacementContext } from "../assessment/usePlacementContext";
import { useAudioEngine } from "../audio/AudioEngineProvider";
import { useLearning } from "../store/LearningStore";
import { useAccessDays } from "../learning/useAccessDays";
import { usePageAttemptPump } from '../sync/usePageAttemptPump';
import { useInteractionXp } from "../store/InteractionXpStore";
import { resolveSystemPageName } from "../system/systemLexicon";
import { emitSystemSignal } from "../system/systemSignals";
import {
  LEARNER_SIDEBAR_STORAGE_KEY,
  readLocalStorage,
  writeLocalStorage,
} from "../lib/storageKeys";
import {
  getInteractionRankProgress,
} from "../system/systemProgression";
import { useSystemUi } from "../system/systemUiPreferences";
import { SystemPromotionOverlay } from "./system/SystemPromotionOverlay";
import { SystemStatusHologram } from "./system/SystemStatusHologram";
import { NgocHeader } from "./NgocHeader";
import { useAwakeningMotion } from "../system/useAwakeningMotion";
import { AwakeningVignette } from "./system/AwakeningVignette";

const navItems = [
  { to: "/", label: "Thức Tỉnh Điện", short: "Tâm", icon: Gauge },
  { to: "/path", label: "Thiên Lộ", short: "Lộ", icon: Map },
  { to: "/review", label: "Ký Ức Trận", short: "Ôn", icon: BrainCircuit },
  { to: "/mistakes", label: "Nghịch Cảnh Lục", short: "Lỗi", icon: Swords },
  { to: "/pronunciation", label: "Vạn Âm Điện", short: "Âm", icon: Mic2 },
  { to: "/characters", label: "Thần Văn Lô", short: "Chữ", icon: PenTool },
  { to: "/reader", label: "Vạn Quyển Các", short: "Đọc", icon: BookOpenText },
  { to: "/exams", label: "Phòng Luyện Đề", short: "Thi", icon: Target },
  { to: "/dictionary", label: "Tàng Tự Khố", short: "Từ", icon: Search },
  { to: "/analytics", label: "Thiên Cơ Kính", short: "Số", icon: BarChart3 },
];

const ASSESSMENT_INVITE_SESSION_KEY = "hanzi-os-assessment-invite-v1";

export function AppShell({ children }: { children: ReactNode }) {
  const { state, sync, level } = useLearning();
  const placementContext = usePlacementContext();
  usePageAttemptPump(sync.session?.authenticated && sync.ownerKey === sync.session.accountKey ? sync.ownerKey : '');
  useAccessDays(sync.session?.authenticated ? sync.session.accountKey : null, sync.session !== null);
  const interactionXp = useInteractionXp();
  const { announce, cancelSpeech } = useAudioEngine();
  const { resolvedMotion, motionQuality, hydrated } = useSystemUi();
  const rank = getInteractionRankProgress(interactionXp.totalXp);
  const displayedLevel = interactionXp.authoritative
    ? Math.floor(interactionXp.totalXp / 500) + 1
    : level;
  const location = useLocation();
  const readerRoute = location.pathname.startsWith("/reader");
  const lessonRoute = location.pathname.startsWith("/lesson/");
  const reviewRoute = location.pathname === "/review";
  const remediationRoute = location.pathname === "/mistakes";
  const readerChapterRoute = /^\/reader\/series\/[^/]+\/chapter\/[^/]+$/u
    .test(location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(() =>
    readLocalStorage(LEARNER_SIDEBAR_STORAGE_KEY) === "collapsed"
  );
  const [statusOpen, setStatusOpen] = useState(false);
  const [assessmentInviteOpen, setAssessmentInviteOpen] = useState(false);
  const [assessmentResume, setAssessmentResume] = useState<PlacementResumeDestination | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  useAwakeningMotion(mainRef, location.pathname);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);
  useEffect(() => {
    writeLocalStorage(
      LEARNER_SIDEBAR_STORAGE_KEY,
      railCollapsed ? "collapsed" : "expanded",
    );
  }, [railCollapsed]);
  const page = resolveSystemPageName(location.pathname, location.search);

  useEffect(() => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    root.style.scrollBehavior = previousScrollBehavior;
    mainRef.current?.focus({ preventScroll: true });
    document.title = `${page.title} | HANZI.OS`;
  }, [location.pathname, page.title]);

  const playAssessmentInvite = useCallback((resume: PlacementResumeDestination | null) => {
    announce(
      resume?.phase === "question"
        ? `Hành giả, Khảo Nghiệm Căn Cơ đang chờ tiếp tục từ câu ${resume.questionNumber}.`
        : resume?.phase === "result"
          ? "Hành giả, kết quả Khảo Nghiệm Căn Cơ đang chờ xác nhận."
          : "Hành giả, Khảo Nghiệm Căn Cơ đang chờ. Hãy tham gia để hệ thống đề xuất điểm khởi hành.",
      {
        clipId: "quest.activated",
        force: true,
        priority: 2,
        sourceId: "assessment-invite",
      },
    );
  }, [announce]);

  useEffect(() => {
    if (
      state.diagnostic.completed
      || hasLearningProgress(state)
      || !placementContext.ready
      || placementContext.preservePath
      || location.pathname.startsWith("/assessment")
      || readerRoute
      || lessonRoute
      || reviewRoute
      || remediationRoute
    ) return;
    const ownerKey = sync.session?.authenticated
      ? sync.session.accountKey
      : sync.ownerKey;
    if (!ownerKey) return;
    const resume = resolvePlacementResumeDestination(undefined, { state, ownerKey, contextSnapshot: placementContext.snapshot });
    const invitationId = resume?.sessionId ?? "new";
    const storageKey = `${ASSESSMENT_INVITE_SESSION_KEY}:${ownerKey}:${invitationId}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      window.sessionStorage.setItem(storageKey, "shown");
    } catch {
      // The invitation may still be shown when session storage is unavailable.
    }
    setAssessmentResume(resume);
    setAssessmentInviteOpen(true);
    const voiceTimer = window.setTimeout(() => playAssessmentInvite(resume), 450);
    return () => window.clearTimeout(voiceTimer);
  }, [lessonRoute, location.pathname, playAssessmentInvite, readerRoute, remediationRoute, reviewRoute, state, sync.ownerKey, sync.session, placementContext.ready, placementContext.preservePath, placementContext.snapshot]);

  useEffect(() => {
    if (!readerRoute && !lessonRoute && !reviewRoute && !remediationRoute) return;
    cancelSpeech();
    setAssessmentInviteOpen(false);
  }, [cancelSpeech, lessonRoute, readerRoute, remediationRoute, reviewRoute]);

  useEffect(() => {
    if (state.diagnostic.completed || hasLearningProgress(state) || placementContext.preservePath) setAssessmentInviteOpen(false);
  }, [state, placementContext.preservePath]);

  const summonStatus = useCallback(() => {
    if (statusOpen) return;
    emitSystemSignal({ type: "system.panel-opened", sourceId: "status:command-bar" });
    setStatusOpen(true);
  }, [statusOpen]);

  useEffect(() => {
    const handleSummonShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      if (event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (statusOpen) {
          emitSystemSignal({ type: "system.panel-closed", sourceId: "status:shortcut" });
          setStatusOpen(false);
        } else {
          summonStatus();
        }
      }
    };
    window.addEventListener("keydown", handleSummonShortcut);
    return () => window.removeEventListener("keydown", handleSummonShortcut);
  }, [statusOpen, summonStatus]);
  const closeStatus = useCallback(() => setStatusOpen(false), []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    mobileMenuCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const menu = document.getElementById("mobile-system-menu");
      const focusable = menu
        ? [...menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        : [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKey);
    };
  }, [mobileMenuOpen]);

  return (
    <div
      className="app-frame"
      data-rail-collapsed={railCollapsed}
      data-system-motion={resolvedMotion}
    >
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <aside className="side-rail" id="learner-navigation">
        <NavLink className="brand-core" to="/" viewTransition aria-label="HANZI.OS - Trang chủ">
          <span className="brand-hex"><Languages size={24} /></span>
          <span>
            <strong>HANZI.OS</strong>
            <small>中文觉醒系统</small>
          </span>
        </NavLink>

        <button
          className="rail-collapse-button"
          type="button"
          onClick={() => setRailCollapsed((collapsed) => !collapsed)}
          aria-label={railCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          aria-expanded={!railCollapsed}
          aria-controls="learner-navigation"
          title={railCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
        >
          {railCollapsed
            ? <PanelLeftOpen size={18} aria-hidden="true" />
            : <PanelLeftClose size={18} aria-hidden="true" />}
          <span>{railCollapsed ? "Mở rộng" : "Thu gọn"}</span>
        </button>

        <div className="system-rank">
          <div className="rank-ring" style={{ "--rank": `${rank.progress * 3.6}deg` } as React.CSSProperties}>
            <span>{displayedLevel}</span>
          </div>
          <span>
            <small>CẤP HỆ THỐNG · HOẠT ĐỘNG</small>
            <strong>{interactionXp.pending
              ? "Đang hợp nhất EXP"
              : `${rank.title} · ${interactionXp.totalXp} XP tương tác`}</strong>
          </span>
        </div>

        <nav className="primary-nav" aria-label="Điều hướng chính">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} viewTransition aria-label={label} title={label}>
              <Icon size={19} />
              <span>{label}</span>
              <ChevronRight className="nav-chevron" size={15} />
            </NavLink>
          ))}
        </nav>

        <div className="rail-footer">
          <NavLink className="premium-rail-link" to="/profile/premium" viewTransition title="Xem gói Premium" aria-label="Xem gói Premium và nâng cấp">
            <Crown size={19} aria-hidden="true" />
            <span>Gói Premium</span>
          </NavLink>
          <NavLink to="/profile" viewTransition title="Cài đặt hồ sơ">
            <Settings size={18} />
            <span>Cấu hình hệ thống</span>
          </NavLink>
          <p><ShieldCheck size={13} /> Tiến độ đã tự động lưu</p>
          <div className="rail-legal"><a href="/privacy">Riêng tư</a><a href="/terms">Điều khoản</a></div>
        </div>
      </aside>

      <div className="app-stage">
        <NgocHeader
          resolvedMotion={resolvedMotion}
          motionQuality={motionQuality}
          hydrated={hydrated}
          title={page.title}
          plainTitle={page.plain}
          name={state.profile.name}
          statusOpen={statusOpen}
          statusButtonRef={statusButtonRef}
          onSummon={summonStatus}
        />

        <main className="main-stage" id="main-content" ref={mainRef} tabIndex={-1}><AwakeningVignette stageRef={mainRef} mode={resolvedMotion} quality={motionQuality} />{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {navItems.slice(0, 4).map(({ to, short, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} viewTransition>
            <Icon size={19} />
            <span>{short}</span>
          </NavLink>
        ))}
        <button className={mobileMenuOpen ? "active" : ""} ref={mobileMenuButtonRef} type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-controls="mobile-system-menu">
          <LayoutGrid size={19} />
          <span>Khác</span>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-menu-scrim" onMouseDown={() => {
          setMobileMenuOpen(false);
          mobileMenuButtonRef.current?.focus();
        }}>
          <section id="mobile-system-menu" className="mobile-system-menu" onMouseDown={(event) => event.stopPropagation()} aria-label="Mở rộng điều hướng" aria-modal="true" role="dialog">
            <header>
              <div><small>SYSTEM MODULES</small><strong>Điện chức năng</strong></div>
              <button ref={mobileMenuCloseRef} type="button" onClick={() => { setMobileMenuOpen(false); mobileMenuButtonRef.current?.focus(); }} aria-label="Đóng bảng chức năng"><X size={19} /></button>
            </header>
            <nav>
              {navItems.slice(4).map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} viewTransition>
                  <Icon size={20} />
                  <span>{label}</span>
                  <ChevronRight size={16} />
                </NavLink>
              ))}
              <NavLink to="/assessment" viewTransition><Target size={20} /><span>Khảo Nghiệm Căn Cơ</span><ChevronRight size={16} /></NavLink>
              <NavLink to="/profile/premium" viewTransition><Crown size={20} /><span>Gói Premium</span><ChevronRight size={16} /></NavLink>
              <NavLink to="/profile" viewTransition><Settings size={20} /><span>Bảng Thuộc Tính</span><ChevronRight size={16} /></NavLink>
            </nav>
          </section>
        </div>
      )}
      {!readerChapterRoute && <SystemStatusHologram open={statusOpen} onClose={closeStatus} returnFocusRef={statusButtonRef} />}
      {!readerChapterRoute && <SystemPromotionOverlay />}
      {assessmentInviteOpen && !readerRoute && !lessonRoute && !reviewRoute && !remediationRoute && (
        <aside className="assessment-invite" role="status" aria-label="Lời mời Khảo Nghiệm Căn Cơ">
          <header>
            <Target size={20} aria-hidden="true" />
            <span>
              <small>NHIỆM VỤ KHỞI HÀNH</small>
              <strong>{assessmentResume ? "Khảo Nghiệm Căn Cơ đang dở" : "Khảo Nghiệm Căn Cơ đang chờ"}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                cancelSpeech();
                setAssessmentInviteOpen(false);
              }}
              aria-label="Đóng lời mời Khảo Nghiệm Căn Cơ"
            >
              <X size={17} />
            </button>
          </header>
          <p>{assessmentResume?.phase === "question"
            ? `Tiến độ HSK${assessmentResume.level} đã lưu tại câu ${assessmentResume.questionNumber}.`
            : assessmentResume?.phase === "result"
              ? `Kết quả tầng HSK${assessmentResume.level} đã được giữ trên thiết bị.`
              : "Tham gia để hệ thống đề xuất điểm khởi hành phù hợp."}</p>
          <div>
            <button type="button" onClick={() => playAssessmentInvite(assessmentResume)} aria-label="Nghe lại lời mời">
              <Volume2 size={18} /> Nghe lại
            </button>
            <Link
              to={assessmentResume?.href ?? "/assessment"}
              viewTransition
              onClick={() => {
                cancelSpeech();
                setAssessmentInviteOpen(false);
              }}
            >
              {assessmentResume?.phase === "question"
                ? `Tiếp tục câu ${assessmentResume.questionNumber}`
                : assessmentResume?.phase === "result"
                  ? "Xem kết quả"
                  : "Tham gia ngay"} <ChevronRight size={17} />
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}
