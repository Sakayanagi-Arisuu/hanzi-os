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

export const SYSTEM_UI_STORAGE_KEY = "hanzi-os-system-ui-v1";

export type SystemMotionMode = "auto" | "balanced" | "cinematic" | "reduced";
export type SystemSoundCue = "summon" | "dismiss" | "select" | "navigate" | "confirm" | "promotion" | "warning";

export type SystemUiPreferences = {
  version: 1;
  motionMode: SystemMotionMode;
  soundEnabled: boolean;
  soundVolume: number;
  voiceEnabled: boolean;
  seenCeremonies: string[];
  equippedTitle?: string;
};

export const DEFAULT_SYSTEM_UI_PREFERENCES: SystemUiPreferences = {
  version: 1,
  motionMode: "auto",
  soundEnabled: true,
  soundVolume: 0.28,
  voiceEnabled: false,
  seenCeremonies: [],
};

const MOTION_MODES = new Set<SystemMotionMode>(["auto", "balanced", "cinematic", "reduced"]);

export const parseSystemUiPreferences = (value: unknown): SystemUiPreferences => {
  if (!value || typeof value !== "object") return DEFAULT_SYSTEM_UI_PREFERENCES;
  const candidate = value as Partial<SystemUiPreferences>;
  const motionMode = MOTION_MODES.has(candidate.motionMode as SystemMotionMode)
    ? candidate.motionMode as SystemMotionMode
    : "auto";
  const seenCeremonies = Array.isArray(candidate.seenCeremonies)
    ? [...new Set(candidate.seenCeremonies.filter((item): item is string => typeof item === "string"))].slice(-64)
    : [];
  return {
    version: 1,
    motionMode,
    soundEnabled: typeof candidate.soundEnabled === "boolean" ? candidate.soundEnabled : true,
    soundVolume: typeof candidate.soundVolume === "number" && Number.isFinite(candidate.soundVolume)
      ? Math.min(1, Math.max(0, candidate.soundVolume))
      : 0.28,
    voiceEnabled: typeof candidate.voiceEnabled === "boolean" ? candidate.voiceEnabled : false,
    seenCeremonies,
    ...(typeof candidate.equippedTitle === "string" && candidate.equippedTitle
      ? { equippedTitle: candidate.equippedTitle }
      : {}),
  };
};

type SystemUiContextValue = {
  preferences: SystemUiPreferences;
  resolvedMotion: Exclude<SystemMotionMode, "auto">;
  hydrated: boolean;
  setMotionMode: (mode: SystemMotionMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  playSystemSound: (cue: SystemSoundCue) => void;
  previewSystemSound: (cue?: SystemSoundCue) => void;
  speakSystemMessage: (message: string) => void;
  markCeremonySeen: (id: string) => void;
  markCeremoniesSeen: (ids: string[]) => void;
  replayCeremonies: () => void;
};

const SystemUiContext = createContext<SystemUiContextValue | null>(null);

export function SystemUiProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_SYSTEM_UI_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSoundAtRef = useRef(0);

  useEffect(() => {
    try {
      setPreferences(parseSystemUiPreferences(JSON.parse(localStorage.getItem(SYSTEM_UI_STORAGE_KEY) ?? "null")));
    } catch {
      setPreferences(DEFAULT_SYSTEM_UI_PREFERENCES);
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setPrefersReducedMotion(media.matches);
    updateMotion();
    media.addEventListener("change", updateMotion);
    setHydrated(true);
    return () => media.removeEventListener("change", updateMotion);
  }, []);

  const persist = useCallback((update: (current: SystemUiPreferences) => SystemUiPreferences) => {
    setPreferences((current) => {
      const next = parseSystemUiPreferences(update(current));
      try {
        localStorage.setItem(SYSTEM_UI_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Visual preferences fail open without affecting learning persistence.
      }
      return next;
    });
  }, []);

  const synthesizeSound = useCallback((cue: SystemSoundCue, force = false) => {
    if ((!preferences.soundEnabled && !force) || typeof window === "undefined") return;
    const nowMs = performance.now();
    if (!force && nowMs - lastSoundAtRef.current < 42) return;
    lastSoundAtRef.current = nowMs;

    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return;
      const context = audioContextRef.current ?? new AudioContextConstructor();
      audioContextRef.current = context;
      void context.resume().catch(() => undefined);
      const volume = Math.max(0.0001, preferences.soundVolume);
      const patterns: Record<SystemSoundCue, Array<[number, number, number, OscillatorType]>> = {
        summon: [[110, 0, 0.24, "sine"], [220, 0.06, 0.3, "triangle"], [440, 0.15, 0.34, "sine"], [880, 0.24, 0.25, "sine"]],
        dismiss: [[520, 0, 0.12, "sine"], [260, 0.07, 0.18, "triangle"]],
        select: [[660, 0, 0.055, "sine"], [990, 0.025, 0.055, "sine"]],
        navigate: [[300, 0, 0.08, "triangle"], [610, 0.055, 0.13, "sine"]],
        confirm: [[410, 0, 0.1, "triangle"], [820, 0.07, 0.16, "sine"], [1230, 0.13, 0.18, "sine"]],
        promotion: [[146, 0, 0.35, "sine"], [293, 0.08, 0.42, "triangle"], [587, 0.2, 0.46, "sine"], [880, 0.34, 0.42, "sine"]],
        warning: [[180, 0, 0.14, "sawtooth"], [145, 0.18, 0.18, "sawtooth"]],
      };
      const startAt = context.currentTime + 0.008;
      patterns[cue].forEach(([frequency, offset, duration, type], index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startAt + offset);
        if (cue === "summon" || cue === "promotion") {
          oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.045, startAt + offset + duration);
        }
        const peak = Math.max(0.0002, volume * (index === 0 ? 0.12 : 0.075));
        gain.gain.setValueAtTime(0.0001, startAt + offset);
        gain.gain.exponentialRampToValueAtTime(peak, startAt + offset + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt + offset);
        oscillator.stop(startAt + offset + duration + 0.02);
      });
    } catch {
      // Sound is an optional enhancement; learning actions must remain available.
    }
  }, [preferences.soundEnabled, preferences.soundVolume]);

  const playSystemSound = useCallback((cue: SystemSoundCue) => {
    synthesizeSound(cue);
  }, [synthesizeSound]);

  const previewSystemSound = useCallback((cue: SystemSoundCue = "summon") => {
    synthesizeSound(cue, true);
  }, [synthesizeSound]);

  const speakSystemMessage = useCallback((message: string) => {
    if (!preferences.voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "vi-VN";
    utterance.rate = 0.92;
    utterance.pitch = 0.86;
    utterance.volume = Math.max(0.15, preferences.soundVolume);
    const vietnameseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("vi"));
    if (vietnameseVoice) utterance.voice = vietnameseVoice;
    window.speechSynthesis.speak(utterance);
  }, [preferences.soundVolume, preferences.voiceEnabled]);

  useEffect(() => {
    if (!hydrated || !preferences.soundEnabled) return;
    const handleInterfaceClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest<HTMLElement>('a[href], button:not([disabled]), [role="button"]');
      if (!control || control.dataset.systemSilent === "true") return;
      const requestedCue = control.dataset.systemSound as SystemSoundCue | undefined;
      if (requestedCue) {
        playSystemSound(requestedCue);
      } else if (control.matches("a[href]")) {
        playSystemSound("navigate");
      } else if (control.classList.contains("primary-button") || control.classList.contains("hero-primary")) {
        playSystemSound("confirm");
      } else {
        playSystemSound("select");
      }
    };
    document.addEventListener("click", handleInterfaceClick);
    return () => document.removeEventListener("click", handleInterfaceClick);
  }, [hydrated, playSystemSound, preferences.soundEnabled]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    const context = audioContextRef.current;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const value = useMemo<SystemUiContextValue>(() => ({
    preferences,
    hydrated,
    resolvedMotion: preferences.motionMode === "auto"
      ? prefersReducedMotion ? "reduced" : "balanced"
      : preferences.motionMode,
    setMotionMode: (motionMode) => persist((current) => ({ ...current, motionMode })),
    setSoundEnabled: (soundEnabled) => persist((current) => ({ ...current, soundEnabled })),
    setSoundVolume: (soundVolume) => persist((current) => ({ ...current, soundVolume })),
    setVoiceEnabled: (voiceEnabled) => persist((current) => ({ ...current, voiceEnabled })),
    playSystemSound,
    previewSystemSound,
    speakSystemMessage,
    markCeremonySeen: (id) => persist((current) => current.seenCeremonies.includes(id)
      ? current
      : { ...current, seenCeremonies: [...current.seenCeremonies, id] }),
    markCeremoniesSeen: (ids) => persist((current) => ({
      ...current,
      seenCeremonies: [...new Set([...current.seenCeremonies, ...ids])],
    })),
    replayCeremonies: () => persist((current) => ({ ...current, seenCeremonies: [] })),
  }), [hydrated, persist, playSystemSound, preferences, prefersReducedMotion, previewSystemSound, speakSystemMessage]);

  return <SystemUiContext.Provider value={value}>{children}</SystemUiContext.Provider>;
}

export const useSystemUi = () => {
  const value = useContext(SystemUiContext);
  if (!value) throw new Error("useSystemUi must be used inside SystemUiProvider");
  return value;
};
