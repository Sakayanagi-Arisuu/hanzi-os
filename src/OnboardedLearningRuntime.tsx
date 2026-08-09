import { useEffect, useRef } from "react";
import { BrowserRouter, useLocation } from "react-router";
import App from "./App";
import { AudioEngineProvider, useAudioEngine } from "./audio/AudioEngineProvider";
import { FullStyleBoundary } from "./components/FullStyleBoundary";
import { SystemVoiceBeacon } from "./components/system/VoiceReactor";
import {
  NormalizedLearningProjectionProvider,
} from "./store/NormalizedLearningProjectionStore";
import { SystemUiProvider } from "./system/systemUiPreferences";

function AudioRouteReset() {
  const location = useLocation();
  const { cancelSpeech } = useAudioEngine();
  const previousPathRef = useRef(location.pathname);
  useEffect(() => {
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    cancelSpeech();
  }, [cancelSpeech, location.pathname]);
  return null;
}

export function OnboardedLearningRuntime() {
  return (
    <>
      <FullStyleBoundary />
      <SystemUiProvider>
        <AudioEngineProvider>
          <NormalizedLearningProjectionProvider>
            <BrowserRouter>
              <AudioRouteReset />
              <App />
              <SystemVoiceBeacon />
            </BrowserRouter>
          </NormalizedLearningProjectionProvider>
        </AudioEngineProvider>
      </SystemUiProvider>
    </>
  );
}
