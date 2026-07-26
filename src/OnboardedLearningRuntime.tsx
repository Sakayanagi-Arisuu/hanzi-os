import { BrowserRouter } from "react-router";
import App from "./App";
import {
  NormalizedLearningProjectionProvider,
} from "./store/NormalizedLearningProjectionStore";

export function OnboardedLearningRuntime() {
  return (
    <NormalizedLearningProjectionProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </NormalizedLearningProjectionProvider>
  );
}
