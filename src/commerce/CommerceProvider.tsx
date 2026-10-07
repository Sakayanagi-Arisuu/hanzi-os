import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { getHskLessonPathId } from "../data/hskCurriculumGraph";
import { useLearning } from "../store/LearningStore";
import { effectiveCommerceSnapshot, remainingPremiumMs, type CommerceSnapshot } from "./policy";
import "./premium.css";

type CommerceContext = { snapshot: CommerceSnapshot | null; loading: boolean; error: string; refresh: () => void };
const Context = createContext<CommerceContext | null>(null);
export function CommerceProvider({ children }: { children: ReactNode }) {
  const { sync } = useLearning();
  const owner = sync.session?.authenticated ? sync.session.accountKey : sync.session ? "guest" : "loading";
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ owner: string; value: CommerceSnapshot | null; error: string; receivedAt: number } | null>(null);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (owner === "loading") return;
    const controller = new AbortController();
    fetch("/api/commerce", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Chưa xác minh được gói học. Hãy kết nối lại và thử lại.");
      const value = await response.json() as CommerceSnapshot;
      if (!controller.signal.aborted) setResult({ owner, value, error: "", receivedAt: performance.now() });
    }).catch(error => { if (!controller.signal.aborted) setResult({ owner, value: null, error: String(error.message ?? error), receivedAt: performance.now() }); });
    return () => controller.abort();
  }, [owner, revision]);
  useEffect(() => {
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [refresh]);
  const current = result?.owner === owner ? result : null;
  useEffect(() => {
    if (!current?.value?.active) return;
    const remaining = remainingPremiumMs(current.value, current.receivedAt);
    if (remaining === 0) return;
    const timer = window.setTimeout(() => {
      // Timer delays and sleeping tabs can only shorten access, never extend it.
      setResult(previous => previous?.owner === owner && previous.value
        ? { ...previous, value: effectiveCommerceSnapshot(previous.value, previous.receivedAt) }
        : previous);
      refresh();
    }, Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [current, owner, refresh]);
  const snapshot = current?.value
    ? effectiveCommerceSnapshot(current.value, current.receivedAt)
    : null;
  return <Context.Provider value={{ snapshot, loading: !current, error: current?.error ?? "", refresh }}>{children}</Context.Provider>;
}
export function useCommerce() {
  const context = useContext(Context);
  if (!context) throw new Error("CommerceProvider missing");
  return context;
}
export function isPremiumLessonPath(pathname: string) {
  const lessonId = /^\/lesson\/([^/]+)/u.exec(pathname)?.[1];
  if (!lessonId) return false;
  try {
    return getHskLessonPathId(decodeURIComponent(lessonId)) === "hsk4";
  } catch {
    return false;
  }
}
export function PremiumRouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const commerce = useCommerce();
  const lessonId = /^\/lesson\/([^/]+)/u.exec(pathname)?.[1];
  const premium = isPremiumLessonPath(pathname)
    && !commerce.snapshot?.freeHsk4LessonIds?.includes(lessonId ? decodeURIComponent(lessonId) : "");
  if (!premium) return children;
  if (commerce.loading) return <section className="premium-gate" role="status"><h1>Đang xác minh gói HSK4</h1><p>Tiến độ học của bạn vẫn được giữ nguyên.</p></section>;
  if (commerce.snapshot?.active) return children;
  return <section className="premium-gate">
    <span className="system-kicker">THIÊN LỘ · PREMIUM</span>
    <h1>Bài học Thiên Lộ HSK4 thuộc gói Premium</h1>
    <p>Thiên Lộ HSK0–HSK3 miễn phí. Từ điển, chữ Hán và các bài khảo nghiệm vẫn dùng bình thường.</p>
    {commerce.error && <p role="alert">{commerce.error} <button type="button" onClick={commerce.refresh}>Thử lại</button></p>}
    <Link className="primary-button" to="/profile/premium">Xem gói Premium</Link>
    <Link className="secondary-button" to="/path">Về Thiên Lộ</Link>
    <p>Hồ sơ, lịch sử và phiên học dở được giữ khi gói hết hạn. Kết nối mạng để xác minh quyền HSK4.</p>
  </section>;
}
