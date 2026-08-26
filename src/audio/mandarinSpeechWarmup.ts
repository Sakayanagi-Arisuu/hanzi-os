type SpeechSynthesisWarmupTarget = {
  getVoices: () => unknown[];
};

/**
 * Starts Chromium's asynchronous voice discovery without enqueueing audio.
 * A silent SpeechSynthesisUtterance can remain pending forever in some
 * Chromium forks and poison every later pronunciation request.
 */
export const createMandarinSpeechPreparer = (
  synthesis: SpeechSynthesisWarmupTarget,
) => {
  return () => {
    try {
      synthesis.getVoices();
      return true;
    } catch {
      return false;
    }
  };
};
