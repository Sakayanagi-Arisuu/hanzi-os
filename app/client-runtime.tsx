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

const FirstRunExperience = lazy(async () => ({
  default: (
    await import("../src/components/FirstRunExperience")
  ).FirstRunExperience,
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
  const setupRequested = typeof window !== "undefined" && (
    window.location.pathname === "/onboarding"
    || new URLSearchParams(window.location.search).get("setup") === "1"
  );

  if (shouldGateLearningBootstrap(sync.phase)) {
    return (
      <RuntimeLoadingState
        message={stateLoadSource === "default"
          ? "Đang mở HANZI.OS..."
          : "Đang khôi phục tiến độ trên thiết bị..."}
      />
    );
  }

  return (
    <Suspense
      fallback={(
        <RuntimeLoadingState
          message={state.profile.onboarded
            ? "Đang mở không gian học..."
            : "Đang mở trang giới thiệu..."}
        />
      )}
    >
      {state.profile.onboarded && !setupRequested
        ? <OnboardedLearningRuntime />
        : <FirstRunExperience />}
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
