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
  constructor(readonly worker: Worker | null, readonly active: Worker | null = null) { super(); }
  getRegistration = vi.fn(async () => ({ waiting: this.worker, active: this.active }));
}
const apply = (container: Container, reload: () => void, timeout?: number) =>
  applyServiceWorkerUpdate(container as unknown as ServiceWorkerContainer, reload, timeout);
afterEach(() => vi.useRealTimers());

describe('explicit application updates', () => {
  it('asks the active worker to release preparation before requesting activation', async () => {
    const waiting = new Worker(), active = new Worker(), order: string[] = [], reload = vi.fn();
    active.postMessage.mockImplementation(() => order.push('pause'));
    waiting.postMessage.mockImplementation(() => order.push('activate'));
    const task = apply(new Container(waiting, active), reload);
    await vi.waitFor(() => expect(waiting.postMessage).toHaveBeenCalled());
    expect(active.postMessage).toHaveBeenCalledWith({ type: 'PAUSE_OFFLINE_PREPARATION' }); expect(order).toEqual(['pause', 'activate']);
    waiting.transition('activated'); await task; expect(reload).toHaveBeenCalledOnce();
  });
  it('can still activate when the old worker cannot receive the preparation message', async () => {
    const waiting = new Worker(), active = new Worker(), reload = vi.fn();
    active.postMessage.mockImplementation(() => { throw new Error('Old worker terminated'); });
    const task = apply(new Container(waiting, active), reload);
    await vi.waitFor(() => expect(waiting.postMessage).toHaveBeenCalled());
    waiting.transition('activated'); await task; expect(reload).toHaveBeenCalledOnce();
  });
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
  it('restores future downloads after failure without resuming a replaced active worker', async () => {
    vi.useFakeTimers();
    const waiting = new Worker(), active = new Worker(), reload = vi.fn(); active.state = 'activated';
    const task = apply(new Container(waiting, active), reload, 100);
    const failure = expect(task).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(100); await failure;
    expect(active.postMessage.mock.calls).toEqual([[{ type: 'PAUSE_OFFLINE_PREPARATION' }], [{ type: 'RESUME_OFFLINE_PREPARATION' }]]);
    waiting.transition('activated'); expect(reload).not.toHaveBeenCalled();
    const replacement = new Worker(), other = new Container(new Worker(), active);
    const registration = { waiting: other.worker, active };
    other.getRegistration.mockImplementation(async () => registration);
    active.postMessage.mockClear();
    const again = apply(other, reload, 100), rejected = expect(again).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(0); registration.active = replacement;
    await vi.advanceTimersByTimeAsync(100); await rejected;
    expect(active.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'PAUSE_OFFLINE_PREPARATION' });
  });
});
