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
  unregisterDevelopmentServiceWorkers,
} from "../src/lib/serviceWorkerRegistration";

const ClientRuntime = lazy(async () => ({
  default: (await import("./client-runtime")).ClientRuntime,
}));

const DEV_SERVICE_WORKER_RELOAD_KEY = "hanzi-os-dev-sw-detached";

function BootstrapShell() {
  return (
    <main className="system-bootstrap" aria-busy="true">
      <ResponsiveHeroBackdrop priority />
      <section className="system-bootstrap-card" aria-live="polite">
        <div className="system-bootstrap-brand"><span>汉</span><div><strong>HANZI.OS</strong><small>Tiếng Trung cho người Việt</small></div></div>
        <div className="system-bootstrap-status">
          <span aria-hidden="true" />
          <strong>Đang mở HANZI.OS...</strong>
        </div>
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

    const initializeClient = async () => {
      if (process.env.NODE_ENV === "development" && "serviceWorker" in navigator) {
        try {
          const needsDetachReload = await unregisterDevelopmentServiceWorkers(
            navigator.serviceWorker,
          );
          if (disposed) return;
          if (
            needsDetachReload
            && sessionStorage.getItem(DEV_SERVICE_WORKER_RELOAD_KEY) !== "1"
          ) {
            sessionStorage.setItem(DEV_SERVICE_WORKER_RELOAD_KEY, "1");
            window.location.reload();
            return;
          }
          sessionStorage.removeItem(DEV_SERVICE_WORKER_RELOAD_KEY);
        } catch {
          // A failed development cleanup must not block the learner runtime.
        }
        if (!disposed) setMounted(true);
        return;
      }

      setMounted(true);
      if (!("serviceWorker" in navigator)) return;
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
    };

    void initializeClient();
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
