"use client";

import {
  lazy,
  StrictMode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { ResponsiveHeroBackdrop } from "../src/components/ResponsiveHeroBackdrop";
import {
  observeServiceWorkerLifecycle,
} from "../src/lib/serviceWorkerRegistration";

const ClientRuntime = lazy(async () => ({
  default: (await import("./client-runtime")).ClientRuntime,
}));

function BootstrapShell() {
  return (
    <main className="onboarding-shell bootstrap-shell" aria-busy="true">
      <ResponsiveHeroBackdrop priority />
      <div className="onboarding-grid" aria-hidden="true" />
      <section className="onboarding-brand">
        <div className="boot-badge">AWAKENING PROTOCOL · LOCAL FIRST</div>
        <div className="onboarding-logo"><span>汉</span><div><strong>HANZI.OS</strong><small>Mandarin Awakening System</small></div></div>
        <h1>Đánh thức một<br /><em>ngôn ngữ mới.</em></h1>
        <p>Lộ trình tiếng Trung thích ứng theo bằng chứng truy hồi, không dùng XP thay cho năng lực.</p>
      </section>
      <section className="onboarding-console bootstrap-console" aria-live="polite">
        <span className="route-loader"><i /><strong>Đang khôi phục tiến độ trên thiết bị...</strong></span>
      </section>
    </main>
  );
}

export function ClientApp() {
  const [mounted, setMounted] = useState(false);
  const [online, setOnline] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [serviceWorkerError, setServiceWorkerError] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadOnControllerChangeRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleStorageError = () => setStorageError(true);
    const handleControllerChange = () => {
      if (!reloadOnControllerChangeRef.current) return;
      reloadOnControllerChangeRef.current = false;
      window.location.reload();
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("hanzi-storage-error", handleStorageError);
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);
    let stopObservingServiceWorker: (() => void) | null = null;
    let disposed = false;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        if (disposed) return;
        registrationRef.current = registration;
        stopObservingServiceWorker = observeServiceWorkerLifecycle(
          registration,
          {
            hasController: () =>
              Boolean(navigator.serviceWorker.controller),
            onInstallFailure: () => setServiceWorkerError(true),
            onUpdateReady: () => setUpdateReady(true),
          },
        );
      }).catch(() => {
        if (!disposed) setServiceWorkerError(true);
      });
    }
    return () => {
      disposed = true;
      stopObservingServiceWorker?.();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("hanzi-storage-error", handleStorageError);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!mounted) {
    return <BootstrapShell />;
  }

  return (
    <>
      <StrictMode>
        <Suspense fallback={<BootstrapShell />}>
          <ClientRuntime />
        </Suspense>
      </StrictMode>
      {(!online || storageError || serviceWorkerError || updateReady) && (
        <aside className="recovery-status" role="status">
          {!online && <span>Đang ngoại tuyến · tiến độ sẽ tiếp tục lưu trên thiết bị.</span>}
          {storageError && <span>Thay đổi vừa rồi chưa được lưu. Hãy giải phóng dung lượng trình duyệt rồi thử thao tác lại.</span>}
          {serviceWorkerError && <button type="button" onClick={() => window.location.reload()}>Cài đặt ngoại tuyến lỗi · thử lại</button>}
          {updateReady && <button type="button" onClick={() => {
            reloadOnControllerChangeRef.current = true;
            registrationRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
          }}>Có bản cập nhật · áp dụng</button>}
        </aside>
      )}
    </>
  );
}
