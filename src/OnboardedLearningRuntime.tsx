import { useEffect, useRef, useState } from "react";
import { BrowserRouter, useLocation } from "react-router";
import App from "./App";
import { AudioEngineProvider, useAudioEngine } from "./audio/AudioEngineProvider";
import { FullStyleBoundary } from "./components/FullStyleBoundary";
import { SystemVoiceBeacon } from "./components/system/VoiceReactor";
import {
  NormalizedLearningProjectionProvider,
  useNormalizedLearningProjection,
} from "./store/NormalizedLearningProjectionStore";
import { useLearning } from './store/LearningContext';
import { learnerRuntimeScopeKey } from './learning/learnerRuntimeScope';
import { readActiveOwnerLearningScope, type ActiveOwnerLearningScope } from './sync/indexedDb';
import { InteractionXpProvider } from "./store/InteractionXpStore";
import { LearningJourneyProvider } from "./store/LearningJourneyStore";
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
            <LearningJourneyProvider>
              <InteractionXpProvider>
                <BrowserRouter>
                  <AudioRouteReset />
                  <ScopedLearnerApp />
                  <SystemVoiceBeacon />
                </BrowserRouter>
              </InteractionXpProvider>
            </LearningJourneyProvider>
          </NormalizedLearningProjectionProvider>
        </AudioEngineProvider>
      </SystemUiProvider>
    </>
  );
}

function ScopedLearnerApp() {
  const { sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const [activeScope, setActiveScope] = useState<ActiveOwnerLearningScope | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => { void readActiveOwnerLearningScope().then(scope => {
      if (active && scope?.ownerGeneration.ownerKey === sync.ownerKey) setActiveScope(scope);
    }).catch(() => undefined); };
    refresh(); window.addEventListener('hanzi-learning-reset', refresh);
    return () => { active = false; window.removeEventListener('hanzi-learning-reset', refresh); };
  }, [sync.ownerKey, sync.lastSyncedAt, authority.resetEpoch, authority.ownerGeneration?.generation]);
  const current = activeScope?.ownerGeneration.ownerKey === sync.ownerKey ? activeScope : null;
  const scope = learnerRuntimeScopeKey(sync.ownerKey, current?.ownerGeneration.generation ?? null, current?.resetEpoch ?? null);
  // Dispose microphone callbacks, unsaved exam selections and handwriting state
  // before another profile can receive them. Durable sessions keep their own scopes.
  return <App key={scope} />;
}
