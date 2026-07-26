import { describe, expect, it, vi } from "vitest";
import {
  observeServiceWorkerLifecycle,
} from "./serviceWorkerRegistration";

class WorkerFixture extends EventTarget {
  state: ServiceWorkerState = "installing";

  transition(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

class RegistrationFixture extends EventTarget {
  installing: WorkerFixture | null = null;
  waiting: WorkerFixture | null = null;

  discover(worker: WorkerFixture) {
    this.installing = worker;
    this.dispatchEvent(new Event("updatefound"));
  }
}

describe("service-worker registration lifecycle", () => {
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
});
