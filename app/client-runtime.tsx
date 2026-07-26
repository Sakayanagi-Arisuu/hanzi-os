"use client";

import { lazy, Suspense } from "react";
import { SystemErrorBoundary } from "../src/components/SystemErrorBoundary";
import { SystemFeedbackProvider } from "../src/components/SystemFeedback";
import { shouldGateLearningBootstrap } from "../src/lib/bootstrapPrivacy";
import {
  LearningProvider,
  useLearning,
} from "../src/store/LearningStore";

const OnboardedLearningRuntime = lazy(async () => ({
  default: (
    await import("../src/OnboardedLearningRuntime")
  ).OnboardedLearningRuntime,
}));

const SystemOnboarding = lazy(async () => ({
  default: (
    await import("../src/components/SystemOnboarding")
  ).SystemOnboarding,
}));

function RuntimeLoadingState({ message }: { message: string }) {
  return (
    <main
      className="route-loader route-loader--fullscreen"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span aria-hidden="true" />
      <strong>{message}</strong>
    </main>
  );
}

function LearningExperience() {
  const { state, sync, stateLoadSource } = useLearning();

  if (shouldGateLearningBootstrap(sync.phase)) {
    return (
      <RuntimeLoadingState
        message={stateLoadSource === "default"
          ? "Đang kiểm tra phiên tài khoản..."
          : "Đang xác minh quyền sở hữu kho học..."}
      />
    );
  }

  return (
    <Suspense
      fallback={(
        <RuntimeLoadingState
          message={state.profile.onboarded
            ? "Đang mở không gian học..."
            : "Đang chuẩn bị hồ sơ học..."}
        />
      )}
    >
      {state.profile.onboarded
        ? <OnboardedLearningRuntime />
        : <SystemOnboarding />}
    </Suspense>
  );
}

export function ClientRuntime() {
  return (
    <LearningProvider>
      <SystemFeedbackProvider>
        <SystemErrorBoundary>
          <LearningExperience />
        </SystemErrorBoundary>
      </SystemFeedbackProvider>
    </LearningProvider>
  );
}
