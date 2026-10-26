/** Apply only on an explicit learner action; never reload a lesson in the background. */
export async function applyServiceWorkerUpdate(
  container: ServiceWorkerContainer,
  reload: () => void,
  timeoutMs = 10_000,
): Promise<void> {
  // Resolve a fresh registration: another tab can replace the worker after
  // the update notice was rendered.
  const registration = await container.getRegistration();
  const waiting = registration?.waiting;
  const active = registration?.active;
  if (!waiting || waiting.state === 'activated' || waiting.state === 'redundant') {
    reload();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    let finished = false;
    const resumePreparation = () => {
      if (active?.state !== 'activated' || registration?.active !== active) return;
      try { active.postMessage({ type: 'RESUME_OFFLINE_PREPARATION' }); }
      catch { /* The old app can still use its already stored offline resources. */ }
    };
    const cleanup = () => {
      clearTimeout(timer);
      waiting.removeEventListener('statechange', inspect);
      container.removeEventListener('controllerchange', activated);
    };
    const activated = () => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve();
      reload();
    };
    const inspect = () => {
      if (waiting.state === 'activated') activated();
      else if (waiting.state === 'redundant') {
        if (finished) return;
        finished = true;
        cleanup();
        resumePreparation();
        reject(new Error('Application update did not activate.'));
      }
    };
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      resumePreparation();
      reject(new Error('Application update timed out.'));
    }, timeoutMs);
    waiting.addEventListener('statechange', inspect);
    container.addEventListener('controllerchange', activated);
    try {
      // An active worker's long offline-preparation message can hold activation
      // open. Stop only those optional downloads on this explicit update action.
      // Older active workers may not support this message; retain timeout safety.
      try { active?.postMessage({ type: 'PAUSE_OFFLINE_PREPARATION' }); }
      catch { /* A terminated active worker must not block the waiting worker. */ }
      waiting.postMessage({ type: 'SKIP_WAITING' });
      inspect();
    } catch (error) {
      if (finished) return;
      finished = true;
      cleanup();
      resumePreparation();
      reject(error);
    }
  });
}
