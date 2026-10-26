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
  if (!waiting || waiting.state === 'activated' || waiting.state === 'redundant') {
    reload();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    let finished = false;
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
        reject(new Error('Application update did not activate.'));
      }
    };
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('Application update timed out.'));
    }, timeoutMs);
    waiting.addEventListener('statechange', inspect);
    container.addEventListener('controllerchange', activated);
    try {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      inspect();
    } catch (error) {
      if (finished) return;
      finished = true;
      cleanup();
      reject(error);
    }
  });
}
