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
  Swords,
  Target,
  X,
  Zap,
} from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getRank } from "../lib/adaptive";
import { useLearning } from "../store/LearningStore";

const navItems = [
  { to: "/", label: "Thức Tỉnh Điện", short: "Tâm", icon: Gauge },
  { to: "/path", label: "Thiên Lộ", short: "Lộ", icon: Map },
  { to: "/review", label: "Ký Ức Trận", short: "Ôn", icon: BrainCircuit },
  { to: "/mistakes", label: "Nghịch Cảnh Lục", short: "Lỗi", icon: Swords },
  { to: "/pronunciation", label: "Vạn Âm Điện", short: "Âm", icon: Mic2 },
  { to: "/characters", label: "Thần Văn Lô", short: "Chữ", icon: PenTool },
  { to: "/reader", label: "Vạn Quyển Các", short: "Đọc", icon: BookOpenText },
  { to: "/dictionary", label: "Tàng Tự Khố", short: "Từ", icon: Search },
  { to: "/analytics", label: "Thiên Cơ Kính", short: "Số", icon: BarChart3 },
];

const pageNames: Record<string, { code: string; title: string }> = {
  "/": { code: "CORE-01", title: "Thức Tỉnh Điện" },
  "/path": { code: "PATH-02", title: "Thiên Lộ" },
  "/review": { code: "MEM-03", title: "Ký Ức Trận FSRS" },
  "/mistakes": { code: "REMEDY-04", title: "Nghịch Cảnh Lục" },
  "/assessment": { code: "ORIGIN-05", title: "Khảo Nghiệm Căn Cơ" },
  "/pronunciation": { code: "VOICE-06", title: "Vạn Âm Điện" },
  "/characters": { code: "GLYPH-07", title: "Thần Văn Lô" },
  "/reader": { code: "READ-08", title: "Vạn Quyển Các" },
  "/dictionary": { code: "LEX-09", title: "Tàng Tự Khố" },
  "/analytics": { code: "MIRROR-10", title: "Thiên Cơ Kính" },
  "/profile": { code: "USER-11", title: "Hồ Sơ Hành Giả" },
};

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dueWordIds, level } = useLearning();
  const rank = getRank(state.xp);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);
  const dailyTarget = state.profile.dailyMinutes * 6;

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);
  const page = location.pathname.startsWith("/lesson/")
    ? { code: "TRIAL-LIVE", title: "Thử luyện đang tiến hành" }
    : (pageNames[location.pathname] ?? pageNames["/"]);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    document.title = `${page.title} | HANZI.OS`;
  }, [location.pathname, page.title]);

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
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <aside className="side-rail">
        <NavLink className="brand-core" to="/" aria-label="HANZI.OS - Trang chủ">
          <span className="brand-hex"><Languages size={24} /></span>
          <span>
            <strong>HANZI.OS</strong>
            <small>中文觉醒系统</small>
          </span>
        </NavLink>

        <div className="system-rank">
          <div className="rank-ring" style={{ "--rank": `${Math.min(360, state.xp * 0.72)}deg` } as React.CSSProperties}>
            <span>{level}</span>
          </div>
          <span>
            <small>RANK</small>
            <strong>{rank.title} · {state.xp} XP</strong>
          </span>
        </div>

        <nav className="primary-nav" aria-label="Điều hướng chính">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} aria-label={label} title={label}>
              <Icon size={19} />
              <span>{label}</span>
              <ChevronRight className="nav-chevron" size={15} />
            </NavLink>
          ))}
        </nav>

        <div className="rail-footer">
          <NavLink to="/profile" title="Cài đặt hồ sơ">
            <Settings size={18} />
            <span>Cấu hình hệ thống</span>
          </NavLink>
          <p><ShieldCheck size={13} /> Tiến độ đã tự động lưu</p>
          <div className="rail-legal"><a href="/privacy">Riêng tư</a><a href="/terms">Điều khoản</a></div>
        </div>
      </aside>

      <div className="app-stage">
        <header className="command-bar">
          <div className="command-title">
            <Orbit size={20} />
            <span>
              <small>{page.code}</small>
              <strong>{page.title}</strong>
            </span>
          </div>
          <div className="system-pulses" aria-label="Trạng thái học tập">
            <span><BrainCircuit size={15} /> {dueWordIds.length} ôn tập</span>
            <span><Flame size={15} /> {state.streak} ngày</span>
            <span><Zap size={15} /> {state.dailyXp}/{dailyTarget} XP</span>
          </div>
          <NavLink className="profile-chip" to="/profile">
            <span className="profile-avatar">{state.profile.name.slice(0, 1).toUpperCase()}</span>
            <span>
              <small>{rank.chinese}</small>
              <strong>{state.profile.name}</strong>
            </span>
          </NavLink>
        </header>

        <main className="main-stage" id="main-content" ref={mainRef} tabIndex={-1}>{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {navItems.slice(0, 4).map(({ to, short, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}>
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
                <NavLink key={to} to={to}>
                  <Icon size={20} />
                  <span>{label}</span>
                  <ChevronRight size={16} />
                </NavLink>
              ))}
              <NavLink to="/assessment"><Target size={20} /><span>Khảo Nghiệm Căn Cơ</span><ChevronRight size={16} /></NavLink>
              <NavLink to="/profile"><Settings size={20} /><span>Hồ Sơ Hành Giả</span><ChevronRight size={16} /></NavLink>
            </nav>
          </section>
        </div>
      )}
    </div>
  );
}
