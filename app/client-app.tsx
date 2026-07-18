"use client";

import { StrictMode, useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import App from "../src/App";
import { SystemErrorBoundary } from "../src/components/SystemErrorBoundary";
import { SystemFeedbackProvider } from "../src/components/SystemFeedback";
import { LearningProvider } from "../src/store/LearningStore";

export function ClientApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  if (!mounted) {
    return (
      <main className="route-loader route-loader--fullscreen" aria-live="polite">
        <span />
        <strong>Đang đồng bộ cảnh giới...</strong>
      </main>
    );
  }

  return (
    <StrictMode>
      <LearningProvider>
        <SystemFeedbackProvider>
          <BrowserRouter>
            <SystemErrorBoundary>
              <App />
            </SystemErrorBoundary>
          </BrowserRouter>
        </SystemFeedbackProvider>
      </LearningProvider>
    </StrictMode>
  );
}
