"use client";

import { lazy, Suspense } from "react";
import { JourneyLoading } from "../src/components/JourneyLoading";
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

function LearningExperience() {
  const { state, sync, stateLoadSource } = useLearning();
  const setupRequested = typeof window !== "undefined" && (
    window.location.pathname === "/onboarding"
    || new URLSearchParams(window.location.search).get("setup") === "1"
  );

  if (shouldGateLearningBootstrap(sync.phase)) {
    return (
      <JourneyLoading fullscreen
        message={stateLoadSource === "default"
          ? "Đang mở HANZI.OS..."
          : "Đang khôi phục tiến độ trên thiết bị..."}
      />
    );
  }

  return (
    <Suspense
      fallback={(
        <JourneyLoading fullscreen
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
