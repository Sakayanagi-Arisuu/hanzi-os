"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { subscribeSystemSignals, type SystemSignalType } from "../system/systemSignals";
import { useSystemUi } from "../system/systemUiPreferences";
import { registerMandarinSpeaker } from "./audioBridge";
import type { SoundCueId } from "./cueCatalog";
import {
  systemVoiceClipForSignal,
  systemVoiceClipUrl,
  type SystemVoiceClipId,
} from "./systemVoicePack";

export type VoicePlaybackPhase = "idle" | "preparing" | "playing" | "ended" | "cancelled" | "error";
export type VoicePlaybackState = {
  phase: VoicePlaybackPhase;
  sourceId?: string;
  language?: "zh-CN" | "vi-VN";
  boundaryIndex?: number;
};

type SpeakOptions = {
  sourceId?: string;
  rate?: number;
  force?: boolean;
  priority?: 1 | 2 | 3;
  clipId?: SystemVoiceClipId;
};

type AudioEngineValue = {
  playCue: (cue: SoundCueId, options?: { force?: boolean }) => void;
  previewCue: (cue?: SoundCueId) => void;
  speakMandarin: (text: string, rate?: number, sourceId?: string) => boolean;
  announce: (message: string, options?: SpeakOptions) => boolean;
  cancelSpeech: () => void;
  playback: VoicePlaybackState;
  voices: SpeechSynthesisVoice[];
  hasVietnameseDeviceVoice: boolean;
};

const AudioEngineContext = createContext<AudioEngineValue | null>(null);
let cueCatalogPromise: Promise<typeof import("./cueCatalog")> | null = null;
const loadCueCatalog = () => cueCatalogPromise ??= import("./cueCatalog");

const CEREMONIAL_SIGNALS = new Set<SystemSignalType>([
  "system.online",
  "quest.activated",
  "lesson.completed",
  "path.unlocked",
  "review.queue-cleared",
  "level-check.completed",
  "rank.threshold-reached",
  "journey.promoted",
  "voice.permission-denied",
]);

const SIGNAL_PRIORITY = (type: SystemSignalType): 1 | 2 | 3 =>
  type === "state.warning" || type === "voice.permission-denied"
    ? 3
    : type === "journey.promoted" || type === "rank.threshold-reached" || type === "level-check.completed"
      ? 3
    : CEREMONIAL_SIGNALS.has(type) ? 2 : 1;

const PRESET_GAIN = { quiet: .62, balanced: .86, awakening: 1 } as const;
const VOICE_TUNING = {
  mechanical: { rate: .82, pitch: .58 },
  oracle: { rate: .88, pitch: .82 },
  executor: { rate: .84, pitch: .72 },
  guide: { rate: .96, pitch: 1.02 },
} as const;

export function AudioEngineProvider({ children }: { children: ReactNode }) {
  const { preferences, hydrated } = useSystemUi();
  const preferencesRef = useRef(preferences);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const effectsGainRef = useRef<GainNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentClipSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentLanguageRef = useRef<"zh-CN" | "vi-VN" | null>(null);
  const currentPriorityRef = useRef<1 | 2 | 3>(1);
  const playbackRequestRef = useRef(0);
  const clipBufferCacheRef = useRef(new Map<string, Promise<AudioBuffer>>());
  const cuePlayedAtRef = useRef(new Map<SoundCueId, number>());
  const announcementAtRef = useRef(new Map<string, number>());
  const bootedRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const playbackTimerRef = useRef<number | null>(null);
  const contextIdleTimerRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const [playback, setPlayback] = useState<VoicePlaybackState>({ phase: "idle" });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    preferencesRef.current = preferences;
    masterGainRef.current?.gain.setTargetAtTime(preferences.soundVolume, audioContextRef.current?.currentTime ?? 0, .02);
    voiceGainRef.current?.gain.setTargetAtTime(
      Math.min(1.5, preferences.voiceVolume * 1.45),
      audioContextRef.current?.currentTime ?? 0,
      .02,
    );
  }, [preferences]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    let listeningForVoices = false;
    const refreshVoices = () => setVoices(window.speechSynthesis.getVoices());
    const activateVoiceInventory = () => {
      if (listeningForVoices) return;
      listeningForVoices = true;
      refreshVoices();
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    };
    document.addEventListener("pointerdown", activateVoiceInventory, { once: true });
    document.addEventListener("focusin", activateVoiceInventory, { once: true });
    return () => {
      document.removeEventListener("pointerdown", activateVoiceInventory);
      document.removeEventListener("focusin", activateVoiceInventory);
      if (listeningForVoices) window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
    };
  }, []);

  const ensureGraph = useCallback(async () => {
    if (typeof window === "undefined" || !window.AudioContext) return null;
    let context = audioContextRef.current;
    if (!context) {
      context = new window.AudioContext();
      const effects = context.createGain();
      const voice = context.createGain();
      const compressor = context.createDynamicsCompressor();
      const master = context.createGain();
      master.gain.value = preferencesRef.current.soundVolume;
      voice.gain.value = Math.min(1.5, preferencesRef.current.voiceVolume * 1.45);
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 8;
      compressor.attack.value = .004;
      compressor.release.value = .16;
      effects.connect(compressor);
      voice.connect(compressor);
      compressor.connect(master);
      master.connect(context.destination);
      effectsGainRef.current = effects;
      voiceGainRef.current = voice;
      masterGainRef.current = master;
      audioContextRef.current = context;
    }
    if (context.state === "suspended") await context.resume();
    return context;
  }, []);

  const playCue = useCallback((cue: SoundCueId, options?: { force?: boolean }) => {
    const prefs = preferencesRef.current;
    if ((!prefs.soundEnabled && !options?.force) || prefs.soundVolume <= 0 || prefs.effectsVolume <= 0) return;
    void loadCueCatalog().then(async ({ CUE_CATALOG }) => {
      const definition = CUE_CATALOG[cue];
      if (!definition || (recordingRef.current && definition.priority < 2 && !cue.startsWith("voice."))) return;
      const now = performance.now();
      const last = cuePlayedAtRef.current.get(cue) ?? 0;
      if (!options?.force && now - last < definition.cooldown) return;
      cuePlayedAtRef.current.set(cue, now);
      const context = await ensureGraph();
      const effects = effectsGainRef.current;
      if (!context || !effects) return;
      const current = preferencesRef.current;
      const startAt = context.currentTime + .008;
      const presetGain = PRESET_GAIN[current.soundPreset];
      definition.tones.forEach(([frequency, offset, duration, wave = "sine"], index) => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, startAt + offset);
        if (definition.sweep) {
          oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(24, frequency * definition.sweep),
            startAt + offset + duration,
          );
        }
        const peak = Math.max(.0001, definition.gain * current.effectsVolume * presetGain * (index ? .72 : 1));
        envelope.gain.setValueAtTime(.0001, startAt + offset);
        envelope.gain.exponentialRampToValueAtTime(peak, startAt + offset + .018);
        envelope.gain.exponentialRampToValueAtTime(.0001, startAt + offset + duration);
        oscillator.connect(envelope);
        envelope.connect(effects);
        oscillator.start(startAt + offset);
        oscillator.stop(startAt + offset + duration + .025);
      });
      if (contextIdleTimerRef.current !== null) window.clearTimeout(contextIdleTimerRef.current);
      contextIdleTimerRef.current = window.setTimeout(() => {
        if (!currentUtteranceRef.current && !currentClipSourceRef.current && !recordingRef.current && context.state === "running") {
          void context.suspend();
        }
      }, Math.max(12_000, Math.ceil(definition.duration * 1000) + 2_000));
    }).catch(() => undefined);
  }, [ensureGraph]);

  const setDucked = useCallback((ducked: boolean) => {
    const context = audioContextRef.current;
    const effects = effectsGainRef.current;
    if (!context || !effects) return;
    effects.gain.cancelScheduledValues(context.currentTime);
    effects.gain.setTargetAtTime(ducked ? .2 : 1, context.currentTime, ducked ? .025 : .08);
  }, []);

  const cancelSpeech = useCallback(() => {
    if (typeof window === "undefined") return;
    playbackRequestRef.current += 1;
    if (currentUtteranceRef.current || currentClipSourceRef.current) {
      setPlayback((current) => ({ ...current, phase: "cancelled" }));
      currentUtteranceRef.current = null;
    }
    if (currentClipSourceRef.current) {
      const source = currentClipSourceRef.current;
      currentClipSourceRef.current = null;
      source.onended = null;
      try {
        source.stop();
      } catch {
        // A source that already ended is safe to ignore.
      }
    }
    currentLanguageRef.current = null;
    currentPriorityRef.current = 1;
    window.speechSynthesis?.cancel();
    setDucked(false);
    if (playbackTimerRef.current !== null) window.clearTimeout(playbackTimerRef.current);
    playbackTimerRef.current = window.setTimeout(() => setPlayback({ phase: "idle" }), 700);
  }, [setDucked]);

  const speakWithBrowser = useCallback((message: string, language: "zh-CN" | "vi-VN", options?: SpeakOptions) => {
    if (!message.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    const prefs = preferencesRef.current;
    if (prefs.voiceVolume <= 0 || prefs.soundVolume <= 0) return false;
    if (language === "vi-VN" && !prefs.voiceEnabled && !options?.force) return false;
    const relevantVoices = window.speechSynthesis.getVoices().filter((voice) =>
      voice.lang.toLowerCase().startsWith(language === "vi-VN" ? "vi" : "zh"),
    );
    if (language === "vi-VN" && !relevantVoices.length) return false;
    const requestedPriority = options?.priority ?? 1;
    if (currentUtteranceRef.current && currentLanguageRef.current === "zh-CN" && language === "vi-VN") return false;
    if ((currentUtteranceRef.current || currentClipSourceRef.current)
      && requestedPriority < currentPriorityRef.current) return false;
    cancelSpeech();
    if (playbackTimerRef.current !== null) window.clearTimeout(playbackTimerRef.current);

    const utterance = new SpeechSynthesisUtterance(message);
    const sourceId = options?.sourceId ?? `${language}:${message.slice(0, 28)}`;
    const preferred = relevantVoices.find((voice) => voice.voiceURI === prefs.preferredVoiceUri) ?? relevantVoices[0];
    utterance.lang = language;
    if (preferred) utterance.voice = preferred;
    if (language === "vi-VN") {
      const tuning = VOICE_TUNING[prefs.voiceProfile];
      utterance.rate = options?.rate ?? tuning.rate;
      utterance.pitch = tuning.pitch;
    } else {
      utterance.rate = options?.rate ?? .82;
      utterance.pitch = 1;
    }
    utterance.volume = Math.min(1, prefs.voiceVolume * prefs.soundVolume * 1.5);
    currentUtteranceRef.current = utterance;
    currentLanguageRef.current = language;
    currentPriorityRef.current = requestedPriority;
    setPlayback({ phase: "preparing", sourceId, language });
    utterance.onstart = () => {
      setDucked(true);
      setPlayback({ phase: "playing", sourceId, language, boundaryIndex: 0 });
      playCue("voice.play-start");
    };
    utterance.onboundary = (event) => setPlayback({
      phase: "playing",
      sourceId,
      language,
      boundaryIndex: event.charIndex,
    });
    utterance.onend = () => {
      currentUtteranceRef.current = null;
      currentLanguageRef.current = null;
      currentPriorityRef.current = 1;
      setDucked(false);
      setPlayback({ phase: "ended", sourceId, language });
      playCue("voice.play-end");
      playbackTimerRef.current = window.setTimeout(() => setPlayback({ phase: "idle" }), 1300);
    };
    utterance.onerror = () => {
      currentUtteranceRef.current = null;
      currentLanguageRef.current = null;
      currentPriorityRef.current = 1;
      setDucked(false);
      setPlayback({ phase: "error", sourceId, language });
      playbackTimerRef.current = window.setTimeout(() => setPlayback({ phase: "idle" }), 2400);
    };
    window.speechSynthesis.speak(utterance);
    return true;
  }, [cancelSpeech, playCue, setDucked]);

  const playSystemClip = useCallback(async (
    clipId: SystemVoiceClipId,
    options?: SpeakOptions,
  ) => {
    const prefs = preferencesRef.current;
    if (prefs.voiceVolume <= 0 || prefs.soundVolume <= 0) return false;
    if (!prefs.voiceEnabled && !options?.force) return false;
    const requestedPriority = options?.priority ?? 1;
    const voiceProfile = prefs.voiceProfile;
    const cacheKey = `${voiceProfile}:${clipId}`;
    if (currentUtteranceRef.current && currentLanguageRef.current === "zh-CN") return false;
    if ((currentUtteranceRef.current || currentClipSourceRef.current)
      && requestedPriority < currentPriorityRef.current) return false;

    cancelSpeech();
    if (playbackTimerRef.current !== null) window.clearTimeout(playbackTimerRef.current);
    const requestId = playbackRequestRef.current;
    const sourceId = options?.sourceId ?? `system-voice:${cacheKey}`;
    currentLanguageRef.current = "vi-VN";
    currentPriorityRef.current = requestedPriority;
    setPlayback({ phase: "preparing", sourceId, language: "vi-VN" });

    try {
      const context = await ensureGraph();
      const voiceGain = voiceGainRef.current;
      if (!context || !voiceGain) throw new Error("audio-context-unavailable");
      let bufferPromise = clipBufferCacheRef.current.get(cacheKey);
      if (!bufferPromise) {
        bufferPromise = fetch(systemVoiceClipUrl(voiceProfile, clipId), { cache: "force-cache" }).then(async (response) => {
          if (!response.ok) throw new Error(`system-voice-${response.status}`);
          return context.decodeAudioData(await response.arrayBuffer());
        });
        clipBufferCacheRef.current.set(cacheKey, bufferPromise);
      }
      let buffer: AudioBuffer;
      try {
        buffer = await bufferPromise;
      } catch (error) {
        clipBufferCacheRef.current.delete(cacheKey);
        throw error;
      }
      if (requestId !== playbackRequestRef.current) return false;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(voiceGain);
      currentClipSourceRef.current = source;
      setDucked(true);
      setPlayback({ phase: "playing", sourceId, language: "vi-VN", boundaryIndex: 0 });
      playCue("voice.play-start");
      source.onended = () => {
        if (currentClipSourceRef.current !== source) return;
        currentClipSourceRef.current = null;
        currentLanguageRef.current = null;
        currentPriorityRef.current = 1;
        setDucked(false);
        setPlayback({ phase: "ended", sourceId, language: "vi-VN" });
        playCue("voice.play-end");
        playbackTimerRef.current = window.setTimeout(() => setPlayback({ phase: "idle" }), 1300);
      };
      source.start();
      return true;
    } catch {
      if (requestId !== playbackRequestRef.current) return false;
      currentClipSourceRef.current = null;
      currentLanguageRef.current = null;
      currentPriorityRef.current = 1;
      setDucked(false);
      setPlayback({
        phase: "error",
        sourceId,
        language: "vi-VN",
      });
      playbackTimerRef.current = window.setTimeout(() => setPlayback({ phase: "idle" }), 2400);
      return false;
    }
  }, [cancelSpeech, ensureGraph, playCue, setDucked]);

  const speakMandarin = useCallback((text: string, rate = .82, sourceId?: string) =>
    speakWithBrowser(text, "zh-CN", { rate, sourceId, force: true, priority: 3 }), [speakWithBrowser]);
  const announce = useCallback((message: string, options?: SpeakOptions) => {
    const clipId = options?.clipId;
    if (!clipId) return speakWithBrowser(message, "vi-VN", options);
    void playSystemClip(clipId, options);
    return true;
  }, [playSystemClip, speakWithBrowser]);

  useEffect(() => {
    registerMandarinSpeaker(speakMandarin);
    return () => registerMandarinSpeaker(null);
  }, [speakMandarin]);

  useEffect(() => subscribeSystemSignals((signal) => {
    if (signal.type === "voice.record-armed" || signal.type === "voice.record-started") recordingRef.current = true;
    if (["voice.record-stopped", "voice.processing", "voice.result", "voice.permission-denied", "voice.error"].includes(signal.type)) {
      recordingRef.current = false;
    }
    void loadCueCatalog().then(({ SIGNAL_CUE_MAP }) => {
      const cue = SIGNAL_CUE_MAP[signal.type];
      if (cue) playCue(cue);
    });
    const prefs = preferencesRef.current;
    if (!prefs.voiceEnabled || prefs.announcementLevel === "off") return;
    if (prefs.announcementLevel === "ceremonial" && !CEREMONIAL_SIGNALS.has(signal.type)) return;
    const clipId = systemVoiceClipForSignal(signal.type);
    const message = signal.message ?? clipId;
    if (!message) return;
    const dedupeKey = `${signal.type}:${message}`;
    const now = Date.now();
    if (now - (announcementAtRef.current.get(dedupeKey) ?? 0) < 2500) return;
    announcementAtRef.current.set(dedupeKey, now);
    announce(message, {
      sourceId: signal.sourceId,
      priority: SIGNAL_PRIORITY(signal.type),
      clipId,
    });
  }), [announce, playCue]);

  useEffect(() => {
    if (!hydrated) return;
    const awaken = () => {
      if (window.location.pathname.startsWith("/reader")) return;
      if (bootedRef.current) return;
      bootedRef.current = true;
      suppressNextClickRef.current = true;
      void ensureGraph();
      playCue("system.boot");
      const prefs = preferencesRef.current;
      if (prefs.voiceEnabled && prefs.announcementLevel !== "off") {
        void announce("Hệ thống đã thức tỉnh. Kết nối cục bộ ổn định.", {
          sourceId: "system-awakening",
          priority: 2,
          clipId: "system.online",
        });
      }
      window.setTimeout(() => { suppressNextClickRef.current = false; }, 250);
    };
    const interfaceClick = (event: MouseEvent) => {
      if (window.location.pathname.startsWith("/reader")) return;
      if (suppressNextClickRef.current) return;
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest<HTMLElement>('a[href], button:not([disabled]), [role="button"]');
      if (!control || control.dataset.systemSilent === "true") return;
      // Level checks already emit semantic correct/retry/completion cues. Avoid
      // layering generic click sounds across dozens of rapid assessment steps.
      if (control.closest(".assessment-live")) return;
      const requestedCue = control.dataset.systemCue as SoundCueId | undefined;
      if (requestedCue) playCue(requestedCue);
      else if (control.matches("a[href]")) playCue("ui.navigate");
      else if (control.classList.contains("primary-button") || control.classList.contains("hero-primary")) playCue("ui.confirm");
      else playCue("ui.select");
    };
    document.addEventListener("pointerdown", awaken, { once: true });
    document.addEventListener("click", interfaceClick);
    return () => {
      document.removeEventListener("pointerdown", awaken);
      document.removeEventListener("click", interfaceClick);
    };
  }, [announce, ensureGraph, hydrated, playCue]);

  useEffect(() => () => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    if (currentClipSourceRef.current) {
      currentClipSourceRef.current.onended = null;
      try {
        currentClipSourceRef.current.stop();
      } catch {
        // Already-ended clips need no cleanup.
      }
      currentClipSourceRef.current = null;
    }
    const context = audioContextRef.current;
    if (playbackTimerRef.current !== null) window.clearTimeout(playbackTimerRef.current);
    if (contextIdleTimerRef.current !== null) window.clearTimeout(contextIdleTimerRef.current);
    if (context && context.state !== "closed") void context.close();
  }, []);

  const value = useMemo<AudioEngineValue>(() => ({
    playCue,
    previewCue: (cue = "system.boot") => playCue(cue, { force: true }),
    speakMandarin,
    announce,
    cancelSpeech,
    playback,
    voices,
    hasVietnameseDeviceVoice: voices.some((voice) => voice.lang.toLowerCase().startsWith("vi")),
  }), [announce, cancelSpeech, playCue, playback, speakMandarin, voices]);

  return <AudioEngineContext.Provider value={value}>{children}</AudioEngineContext.Provider>;
}

export const useAudioEngine = () => {
  const value = useContext(AudioEngineContext);
  if (!value) throw new Error("useAudioEngine must be used inside AudioEngineProvider");
  return value;
};
