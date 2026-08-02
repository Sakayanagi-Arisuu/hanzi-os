"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const SYSTEM_UI_STORAGE_KEY = "hanzi-os-system-ui-v1";

export type SystemMotionMode = "auto" | "balanced" | "cinematic" | "reduced";
export type SystemSoundPreset = "quiet" | "balanced" | "awakening";
export type SystemVoiceProfile = "oracle" | "executor" | "guide";
export type SystemAnnouncementLevel = "off" | "ceremonial" | "full";

export type SystemUiPreferences = {
  version: 2;
  motionMode: SystemMotionMode;
  soundEnabled: boolean;
  soundVolume: number;
  effectsVolume: number;
  soundPreset: SystemSoundPreset;
  voiceEnabled: boolean;
  voiceVolume: number;
  voiceProfile: SystemVoiceProfile;
  preferredVoiceUri?: string;
  announcementLevel: SystemAnnouncementLevel;
  seenCeremonies: string[];
  equippedTitle?: string;
};

export const DEFAULT_SYSTEM_UI_PREFERENCES: SystemUiPreferences = {
  version: 2,
  motionMode: "auto",
  soundEnabled: true,
  soundVolume: 0.44,
  effectsVolume: 0.72,
  soundPreset: "awakening",
  voiceEnabled: false,
  voiceVolume: 0.82,
  voiceProfile: "oracle",
  announcementLevel: "ceremonial",
  seenCeremonies: [],
};

const MOTION_MODES = new Set<SystemMotionMode>(["auto", "balanced", "cinematic", "reduced"]);
const SOUND_PRESETS = new Set<SystemSoundPreset>(["quiet", "balanced", "awakening"]);
const VOICE_PROFILES = new Set<SystemVoiceProfile>(["oracle", "executor", "guide"]);
const ANNOUNCEMENT_LEVELS = new Set<SystemAnnouncementLevel>(["off", "ceremonial", "full"]);
const clampVolume = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value)
  ? Math.min(1, Math.max(0, value))
  : fallback;

export const parseSystemUiPreferences = (value: unknown): SystemUiPreferences => {
  if (!value || typeof value !== "object") return DEFAULT_SYSTEM_UI_PREFERENCES;
  const candidate = value as Partial<Omit<SystemUiPreferences, "version">> & { version?: number };
  const migratedMaster = candidate.version === 1 && candidate.soundVolume === 0.28
    ? DEFAULT_SYSTEM_UI_PREFERENCES.soundVolume
    : clampVolume(candidate.soundVolume, DEFAULT_SYSTEM_UI_PREFERENCES.soundVolume);
  const seenCeremonies = Array.isArray(candidate.seenCeremonies)
    ? [...new Set(candidate.seenCeremonies.filter((item): item is string => typeof item === "string"))].slice(-64)
    : [];

  return {
    version: 2,
    motionMode: MOTION_MODES.has(candidate.motionMode as SystemMotionMode)
      ? candidate.motionMode as SystemMotionMode
      : "auto",
    soundEnabled: typeof candidate.soundEnabled === "boolean" ? candidate.soundEnabled : true,
    soundVolume: migratedMaster,
    effectsVolume: clampVolume(candidate.effectsVolume, DEFAULT_SYSTEM_UI_PREFERENCES.effectsVolume),
    soundPreset: SOUND_PRESETS.has(candidate.soundPreset as SystemSoundPreset)
      ? candidate.soundPreset as SystemSoundPreset
      : DEFAULT_SYSTEM_UI_PREFERENCES.soundPreset,
    voiceEnabled: typeof candidate.voiceEnabled === "boolean" ? candidate.voiceEnabled : false,
    voiceVolume: clampVolume(candidate.voiceVolume, DEFAULT_SYSTEM_UI_PREFERENCES.voiceVolume),
    voiceProfile: VOICE_PROFILES.has(candidate.voiceProfile as SystemVoiceProfile)
      ? candidate.voiceProfile as SystemVoiceProfile
      : DEFAULT_SYSTEM_UI_PREFERENCES.voiceProfile,
    ...(typeof candidate.preferredVoiceUri === "string" && candidate.preferredVoiceUri
      ? { preferredVoiceUri: candidate.preferredVoiceUri }
      : {}),
    announcementLevel: ANNOUNCEMENT_LEVELS.has(candidate.announcementLevel as SystemAnnouncementLevel)
      ? candidate.announcementLevel as SystemAnnouncementLevel
      : DEFAULT_SYSTEM_UI_PREFERENCES.announcementLevel,
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
  setEffectsVolume: (volume: number) => void;
  setSoundPreset: (preset: SystemSoundPreset) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setVoiceVolume: (volume: number) => void;
  setVoiceProfile: (profile: SystemVoiceProfile) => void;
  setPreferredVoiceUri: (voiceUri?: string) => void;
  setAnnouncementLevel: (level: SystemAnnouncementLevel) => void;
  markCeremonySeen: (id: string) => void;
  markCeremoniesSeen: (ids: string[]) => void;
  replayCeremonies: () => void;
};

const SystemUiContext = createContext<SystemUiContextValue | null>(null);

export function SystemUiProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_SYSTEM_UI_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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
        // Presentation preferences fail open without touching learning evidence.
      }
      return next;
    });
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
    setEffectsVolume: (effectsVolume) => persist((current) => ({ ...current, effectsVolume })),
    setSoundPreset: (soundPreset) => persist((current) => ({ ...current, soundPreset })),
    setVoiceEnabled: (voiceEnabled) => persist((current) => ({ ...current, voiceEnabled })),
    setVoiceVolume: (voiceVolume) => persist((current) => ({ ...current, voiceVolume })),
    setVoiceProfile: (voiceProfile) => persist((current) => ({ ...current, voiceProfile })),
    setPreferredVoiceUri: (preferredVoiceUri) => persist((current) => ({
      ...current,
      ...(preferredVoiceUri ? { preferredVoiceUri } : { preferredVoiceUri: undefined }),
    })),
    setAnnouncementLevel: (announcementLevel) => persist((current) => ({ ...current, announcementLevel })),
    markCeremonySeen: (id) => persist((current) => current.seenCeremonies.includes(id)
      ? current
      : { ...current, seenCeremonies: [...current.seenCeremonies, id] }),
    markCeremoniesSeen: (ids) => persist((current) => ({
      ...current,
      seenCeremonies: [...new Set([...current.seenCeremonies, ...ids])],
    })),
    replayCeremonies: () => persist((current) => ({ ...current, seenCeremonies: [] })),
  }), [hydrated, persist, preferences, prefersReducedMotion]);

  return <SystemUiContext.Provider value={value}>{children}</SystemUiContext.Provider>;
}

export const useSystemUi = () => {
  const value = useContext(SystemUiContext);
  if (!value) throw new Error("useSystemUi must be used inside SystemUiProvider");
  return value;
};
