import { describe, expect, it, vi } from "vitest";
import {
  observeServiceWorkerLifecycle,
  unregisterDevelopmentServiceWorkers,
} from "./serviceWorkerRegistration";

class WorkerFixture extends EventTarget {
  state: ServiceWorkerState = "installing";

  transition(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

class RegistrationFixture extends EventTarget {
  active: WorkerFixture | null = null;
  installing: WorkerFixture | null = null;
  waiting: WorkerFixture | null = null;

  discover(worker: WorkerFixture) {
    this.installing = worker;
    this.dispatchEvent(new Event("updatefound"));
  }
}

describe("service-worker registration lifecycle", () => {
  it("unregisters every stale development worker and requests one detach reload", async () => {
    const unregisterFirst = vi.fn().mockResolvedValue(true);
    const unregisterSecond = vi.fn().mockResolvedValue(true);
    const serviceWorker = {
      controller: {},
      getRegistrations: vi.fn().mockResolvedValue([
        { unregister: unregisterFirst },
        { unregister: unregisterSecond },
      ]),
    } as unknown as ServiceWorkerContainer;

    await expect(unregisterDevelopmentServiceWorkers(serviceWorker)).resolves.toBe(true);
    expect(unregisterFirst).toHaveBeenCalledOnce();
    expect(unregisterSecond).toHaveBeenCalledOnce();
  });

  it("does not request a detach reload when no worker controls the page", async () => {
    const serviceWorker = {
      controller: null,
      getRegistrations: vi.fn().mockResolvedValue([]),
    } as unknown as ServiceWorkerContainer;

    await expect(unregisterDevelopmentServiceWorkers(serviceWorker)).resolves.toBe(false);
  });

  it("reports an initial worker that becomes redundant after register resolves", () => {
    const worker = new WorkerFixture();
    const registration = new RegistrationFixture();
    registration.installing = worker;
    const onInstallFailure = vi.fn();
    const cleanup = observeServiceWorkerLifecycle(
      registration as unknown as ServiceWorkerRegistration,
      {
        hasController: () => false,
        onInstallFailure,
        onUpdateReady: vi.fn(),
      },
    );

    worker.transition("redundant");
    expect(onInstallFailure).toHaveBeenCalledOnce();
    cleanup();
    worker.transition("redundant");
    expect(onInstallFailure).toHaveBeenCalledOnce();
  });

  it("observes later update workers and distinguishes an installed update", () => {
    const registration = new RegistrationFixture();
    const onUpdateReady = vi.fn();
    observeServiceWorkerLifecycle(
      registration as unknown as ServiceWorkerRegistration,
      {
        hasController: () => true,
        onInstallFailure: vi.fn(),
        onUpdateReady,
      },
    );
    const worker = new WorkerFixture();
    registration.discover(worker);
    worker.transition("installed");
    expect(onUpdateReady).toHaveBeenCalledOnce();
  });

  it('does not label an activated worker or a waiting worker with a healthy replacement as a failed install', () => {
    for (const state of ['installed', 'activated'] as const) {
      const registration = new RegistrationFixture(), worker = new WorkerFixture();
      registration.installing = worker;
      const onInstallFailure = vi.fn(), onInstallSuccess = vi.fn();
      observeServiceWorkerLifecycle(registration as unknown as ServiceWorkerRegistration, {
        hasController: () => true, onInstallFailure, onInstallSuccess, onUpdateReady: vi.fn(),
      });
      worker.transition(state);
      if (state === 'installed') {
        const replacement = new WorkerFixture(); replacement.state = 'installed'; registration.waiting = replacement;
      }
      worker.transition('redundant');
      expect(onInstallSuccess).toHaveBeenCalledOnce(); expect(onInstallFailure).not.toHaveBeenCalled();
    }
  });

  it('still reports activation failure when installation finished but no healthy replacement exists', () => {
    const registration = new RegistrationFixture(), worker = new WorkerFixture();
    registration.installing = worker;
    const onInstallFailure = vi.fn();
    observeServiceWorkerLifecycle(registration as unknown as ServiceWorkerRegistration, {
      hasController: () => false, onInstallFailure, onUpdateReady: vi.fn(),
    });
    worker.transition('installed'); worker.transition('activating'); worker.transition('redundant');
    expect(onInstallFailure).toHaveBeenCalledOnce();
  });

  it('ignores superseded failures, deduplicates failure events, and reports a later successful attempt', () => {
    const registration = new RegistrationFixture(), old = new WorkerFixture(), current = new WorkerFixture();
    registration.installing = old;
    const onInstallFailure = vi.fn(), onInstallSuccess = vi.fn();
    observeServiceWorkerLifecycle(registration as unknown as ServiceWorkerRegistration, {
      hasController: () => false, onInstallFailure, onInstallSuccess, onUpdateReady: vi.fn(),
    });
    registration.discover(current); old.transition('redundant');
    expect(onInstallFailure).not.toHaveBeenCalled();
    current.transition('redundant'); current.transition('redundant');
    expect(onInstallFailure).toHaveBeenCalledOnce();
    const retry = new WorkerFixture(); registration.discover(retry); retry.transition('installed');
    expect(onInstallSuccess).toHaveBeenCalledOnce();
  });
});
