import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyServiceWorkerUpdate } from './applyServiceWorkerUpdate';

class Worker extends EventTarget {
  state: ServiceWorkerState = 'installed';
  postMessage = vi.fn();
  transition(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}
class Container extends EventTarget {
  constructor(readonly worker: Worker | null) { super(); }
  getRegistration = vi.fn(async () => ({ waiting: this.worker }));
}
const apply = (container: Container, reload: () => void, timeout?: number) =>
  applyServiceWorkerUpdate(container as unknown as ServiceWorkerContainer, reload, timeout);
afterEach(() => vi.useRealTimers());

describe('explicit application updates', () => {
  it('reloads when another tab already activated the update', async () => {
    const reload = vi.fn();
    await apply(new Container(null), reload);
    expect(reload).toHaveBeenCalledOnce();
  });
  it('waits for activation and reloads once even without controllerchange', async () => {
    const worker = new Worker();
    const container = new Container(worker);
    const reload = vi.fn();
    const task = apply(container, reload);
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' }));
    expect(reload).not.toHaveBeenCalled();
    worker.transition('activated');
    container.dispatchEvent(new Event('controllerchange'));
    await task;
    expect(reload).toHaveBeenCalledOnce();
  });
  it('cleans up after controllerchange and does not reload again later', async () => {
    const worker = new Worker();
    const container = new Container(worker);
    const reload = vi.fn();
    const task = apply(container, reload);
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalled());
    container.dispatchEvent(new Event('controllerchange'));
    await task;
    worker.transition('activated');
    expect(reload).toHaveBeenCalledOnce();
  });
  it('preserves the current lesson when the worker fails', async () => {
    const worker = new Worker();
    const reload = vi.fn();
    const task = apply(new Container(worker), reload);
    const failure = expect(task).rejects.toThrow('did not activate');
    await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalled());
    worker.transition('redundant');
    await failure;
    expect(reload).not.toHaveBeenCalled();
  });
  it('reports a stalled update and removes late reload listeners', async () => {
    vi.useFakeTimers();
    const worker = new Worker();
    const reload = vi.fn();
    const task = apply(new Container(worker), reload, 100);
    const failure = expect(task).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(100);
    await failure;
    worker.transition('activated');
    expect(reload).not.toHaveBeenCalled();
  });
});
