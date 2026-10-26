export type ServiceWorkerLifecycleCallbacks = {
  hasController: () => boolean;
  onInstallFailure: () => void;
  onInstallSuccess?: () => void;
  onUpdateReady: () => void;
};

/**
 * Development modules change without the content-hashed URLs used by a
 * production build. An older worker can therefore serve a stale Vite module
 * graph and leave the app stuck on its bootstrap screen. Unregistering here is
 * intentionally development-only; production keeps its offline worker.
 *
 * The return value tells the caller whether the current page was controlled
 * and needs one reload to detach from the removed worker.
 */
export async function unregisterDevelopmentServiceWorkers(
  serviceWorker: ServiceWorkerContainer,
) {
  const hadController = Boolean(serviceWorker.controller);
  const registrations = await serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  return hadController;
}

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
  let latestWorker: ServiceWorker | null = null;

  const observeWorker = (worker: ServiceWorker | null) => {
    if (!worker || observedWorkers.has(worker)) return;
    observedWorkers.add(worker);
    latestWorker = worker;
    let installedSuccessfully = false;
    let activatedSuccessfully = false;
    let reportedFailure = false;

    const inspect = () => {
      const successful = ['installed', 'activating', 'activated'].includes(worker.state);
      if (successful && !installedSuccessfully) {
        installedSuccessfully = true;
        if (latestWorker === worker) callbacks.onInstallSuccess?.();
      }
      if (worker.state === 'activated') activatedSuccessfully = true;
      const healthyReplacement = installedSuccessfully && [registration.waiting, registration.active]
        .some(candidate => candidate && candidate !== worker && ['installed', 'activating', 'activated'].includes(candidate.state));
      // Successful active/waiting workers become redundant when replaced.
      // That transition is not a failed install, nor is a superseded attempt
      // authoritative over the newer worker now being observed.
      if (worker.state === "redundant" && !activatedSuccessfully && !healthyReplacement && latestWorker === worker && !reportedFailure) {
        reportedFailure = true;
        callbacks.onInstallFailure();
      }
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

  if (registration.waiting) { callbacks.onInstallSuccess?.(); callbacks.onUpdateReady(); }
  observeWorker(registration.installing);

  return () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
  };
}
