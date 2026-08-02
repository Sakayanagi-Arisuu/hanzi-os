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

export type SystemUiPreferences = {
  version: 1;
  motionMode: SystemMotionMode;
  seenCeremonies: string[];
  equippedTitle?: string;
};

export const DEFAULT_SYSTEM_UI_PREFERENCES: SystemUiPreferences = {
  version: 1,
  motionMode: "auto",
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
        // Visual preferences fail open without affecting learning persistence.
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
