"use client";

import {
  lazy,
  StrictMode,
  Suspense,
  useEffect,
  useState,
} from "react";
import { ResponsiveHeroBackdrop } from "../src/components/ResponsiveHeroBackdrop";
import {
  observeServiceWorkerLifecycle,
  unregisterDevelopmentServiceWorkers,
} from "../src/lib/serviceWorkerRegistration";
import { isNativeApp } from '../src/native/nativeRuntime';
import { applyServiceWorkerUpdate } from '../src/lib/applyServiceWorkerUpdate';
import { RecoveryStatusBoundary } from '../src/components/RecoveryStatusBoundary';

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
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [updateApplying, setUpdateApplying] = useState(false);
  const [updateError, setUpdateError] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleStorageError = () => setStorageError(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("hanzi-storage-error", handleStorageError);
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
      if (isNativeApp()) return;
      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.register("/sw.js?offline=1").then((registration) => {
        if (disposed) return;
        stopObservingServiceWorker = observeServiceWorkerLifecycle(
          registration,
          {
            hasController: () =>
              Boolean(navigator.serviceWorker.controller),
            onInstallFailure: () => setServiceWorkerError(true),
            onInstallSuccess: () => setServiceWorkerError(false),
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
    };
  }, []);

  if (!mounted) {
    return <BootstrapShell />;
  }

  const recoveryStatus = (!online || storageError || serviceWorkerError || (updateReady && !updateDismissed)) && (
        <aside className="recovery-status" role="status">
          {!online && <span>Đang ngoại tuyến · tiến độ sẽ tiếp tục lưu trên thiết bị.</span>}
          {storageError && <span>Thay đổi vừa rồi chưa được lưu. Hãy giải phóng dung lượng trình duyệt rồi thử thao tác lại.</span>}
          {serviceWorkerError && <button type="button" onClick={() => window.location.reload()}>Cài đặt ngoại tuyến lỗi · thử lại</button>}
          {updateReady && !updateDismissed && <>
            {updateError && <span>Chưa cập nhật được. Bạn có thể học tiếp và thử lại sau.</span>}
            <div className="recovery-update-actions"><button type="button" disabled={updateApplying} onClick={async () => {
              setUpdateApplying(true);
              setUpdateError(false);
              try { await applyServiceWorkerUpdate(navigator.serviceWorker, () => window.location.reload()); }
              catch { setUpdateError(true); setUpdateApplying(false); }
            }}>{updateApplying ? 'Đang cập nhật…' : 'Cập nhật ứng dụng'}</button><button type="button" aria-label="Để cập nhật sau" onClick={() => setUpdateDismissed(true)}>Để sau</button></div>
          </>}
        </aside>
      );

  return (
    <RecoveryStatusBoundary status={recoveryStatus}>
      <StrictMode>
        <Suspense fallback={<BootstrapShell />}>
          <ClientRuntime />
        </Suspense>
      </StrictMode>
    </RecoveryStatusBoundary>
  );
}
