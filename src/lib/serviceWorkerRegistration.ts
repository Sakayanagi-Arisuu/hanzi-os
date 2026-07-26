export type ServiceWorkerLifecycleCallbacks = {
  hasController: () => boolean;
  onInstallFailure: () => void;
  onUpdateReady: () => void;
};

/**
 * Observes both the worker already installing when `register()` resolves and
 * later update workers. A registration promise can resolve before installation
 * finishes, so rejection of `register()` alone is not an install-failure signal.
 */
export function observeServiceWorkerLifecycle(
  registration: ServiceWorkerRegistration,
  callbacks: ServiceWorkerLifecycleCallbacks,
) {
  const cleanups: Array<() => void> = [];
  const observedWorkers = new Set<ServiceWorker>();

  const observeWorker = (worker: ServiceWorker | null) => {
    if (!worker || observedWorkers.has(worker)) return;
    observedWorkers.add(worker);

    const inspect = () => {
      if (worker.state === "redundant") callbacks.onInstallFailure();
      if (
        worker.state === "installed"
        && callbacks.hasController()
      ) callbacks.onUpdateReady();
    };
    worker.addEventListener("statechange", inspect);
    cleanups.push(() => worker.removeEventListener("statechange", inspect));
    inspect();
  };

  const handleUpdateFound = () => observeWorker(registration.installing);
  registration.addEventListener("updatefound", handleUpdateFound);
  cleanups.push(() =>
    registration.removeEventListener("updatefound", handleUpdateFound)
  );

  if (registration.waiting) callbacks.onUpdateReady();
  observeWorker(registration.installing);

  return () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
  };
}
