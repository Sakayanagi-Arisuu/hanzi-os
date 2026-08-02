import { BrowserRouter } from "react-router";
import App from "./App";
import {
  NormalizedLearningProjectionProvider,
} from "./store/NormalizedLearningProjectionStore";
import { SystemUiProvider } from "./system/systemUiPreferences";

export function OnboardedLearningRuntime() {
  return (
    <SystemUiProvider>
      <NormalizedLearningProjectionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </NormalizedLearningProjectionProvider>
    </SystemUiProvider>
  );
}
