import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SystemErrorBoundary } from "./components/SystemErrorBoundary";
import { SystemFeedbackProvider } from "./components/SystemFeedback";
import { LearningProvider } from "./store/LearningStore";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
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
  </StrictMode>,
);
