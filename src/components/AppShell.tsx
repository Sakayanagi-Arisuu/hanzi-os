import {
  BarChart3,
  BookOpenText,
  BrainCircuit,
  ChevronRight,
  Flame,
  Gauge,
  Languages,
  LayoutGrid,
  Map,
  Mic2,
  Orbit,
  PenTool,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  X,
  Zap,
} from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLearning } from "../store/LearningStore";
import { resolveSystemPageName } from "../system/systemLexicon";
import { emitSystemSignal } from "../system/systemSignals";
import {
  getInteractionRankProgress,
  getSystemClass,
} from "../system/systemProgression";
import { useSystemUi } from "../system/systemUiPreferences";
import { SystemAtmosphere } from "./system/SystemAtmosphere";
import { SystemPromotionOverlay } from "./system/SystemPromotionOverlay";
import { SystemRoutePulse } from "./system/SystemRoutePulse";
import { SystemStatusHologram } from "./system/SystemStatusHologram";

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

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dueWordIds, level } = useLearning();
  const { resolvedMotion } = useSystemUi();
  const rank = getInteractionRankProgress(state.xp);
  const systemClass = getSystemClass(state.profile.goal);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);
  const dailyTarget = state.profile.dailyMinutes * 6;

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);
  const page = resolveSystemPageName(location.pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
    document.title = `${page.title} | HANZI.OS`;
  }, [location.pathname, page.title]);

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
          emitSystemSignal({ type: "system.panel-opened", sourceId: "status:shortcut" });
          setStatusOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleSummonShortcut);
    return () => window.removeEventListener("keydown", handleSummonShortcut);
  }, [statusOpen]);

  const summonStatus = () => {
    emitSystemSignal({ type: "system.panel-opened", sourceId: "status:command-bar" });
    setStatusOpen(true);
  };
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
    <div className="app-frame" data-system-motion={resolvedMotion}>
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <SystemAtmosphere />
      <aside className="side-rail">
        <NavLink className="brand-core" to="/" viewTransition aria-label="HANZI.OS - Trang chủ">
          <span className="brand-hex"><Languages size={24} /></span>
          <span>
            <strong>HANZI.OS</strong>
            <small>中文觉醒系统</small>
          </span>
        </NavLink>

        <div className="system-rank">
          <div className="rank-ring" style={{ "--rank": `${rank.progress * 3.6}deg` } as React.CSSProperties}>
            <span>{level}</span>
          </div>
          <span>
            <small>CẤP HỆ THỐNG · HOẠT ĐỘNG</small>
            <strong>{rank.title} · {state.xp} XP tương tác</strong>
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
          <NavLink to="/profile" viewTransition title="Cài đặt hồ sơ">
            <Settings size={18} />
            <span>Cấu hình hệ thống</span>
          </NavLink>
          <p><ShieldCheck size={13} /> Tiến độ đã tự động lưu</p>
          <div className="rail-legal"><a href="/privacy">Riêng tư</a><a href="/terms">Điều khoản</a></div>
        </div>
      </aside>

      <div className="app-stage">
        <SystemRoutePulse />
        <header className="command-bar">
          <div className="command-title">
            <Orbit size={20} />
            <span>
              <small>{page.code} · {page.plain}</small>
              <strong>{page.title}</strong>
            </span>
          </div>
          <div className="system-pulses" aria-label="Trạng thái học tập">
            <span><BrainCircuit size={15} /> {dueWordIds.length} ôn tập</span>
            <span><Flame size={15} /> {state.streak} ngày</span>
            <span><Zap size={15} /> {state.dailyXp}/{dailyTarget} XP</span>
          </div>
          <button
            ref={statusButtonRef}
            className="sys-summon-trigger"
            type="button"
            onClick={summonStatus}
            data-system-silent="true"
            aria-haspopup="dialog"
            aria-expanded={statusOpen}
            title="Triệu hồi Bảng Hệ Thống · Alt + S"
          >
            <Sparkles size={17} />
            <span><small>ALT + S</small><strong>TRIỆU HỒI</strong></span>
          </button>
          <NavLink className="profile-chip" to="/profile" viewTransition>
            <span className="profile-avatar">{state.profile.name.slice(0, 1).toUpperCase()}</span>
            <span>
              <small>{systemClass.title}</small>
              <strong>{state.profile.name}</strong>
            </span>
          </NavLink>
        </header>

        <main className="main-stage" id="main-content" ref={mainRef} tabIndex={-1}>{children}</main>
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
              <NavLink to="/profile" viewTransition><Settings size={20} /><span>Bảng Thuộc Tính</span><ChevronRight size={16} /></NavLink>
            </nav>
          </section>
        </div>
      )}
      <SystemStatusHologram open={statusOpen} onClose={closeStatus} returnFocusRef={statusButtonRef} />
      <SystemPromotionOverlay />
    </div>
  );
}
