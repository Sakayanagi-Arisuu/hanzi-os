import type { SystemMotionMode } from "./systemUiPreferences";

export type MotionFamily = "awakening" | "path" | "lesson" | "memory" | "repair" | "voice" | "forge" | "reader" | "lexicon" | "trial" | "oracle" | "profile" | "premium";
export type MotionQuality = "full" | "light";
export type DeviceMotionHints = { cores?: number; memory?: number; saveData?: boolean };

export function resolveMotionQuality(hints: DeviceMotionHints): MotionQuality {
  return hints.saveData || (hints.cores !== undefined && hints.cores <= 4)
    || (hints.memory !== undefined && hints.memory <= 4) ? "light" : "full";
}

export function resolveMotionMode(mode: SystemMotionMode, reduced: boolean, quality: MotionQuality): Exclude<SystemMotionMode, "auto"> {
  if (reduced || mode === "reduced") return "reduced";
  return mode === "auto" ? quality === "light" ? "balanced" : "cinematic" : mode;
}

export function motionFamilyForPath(path: string): MotionFamily {
  if (path.startsWith("/lesson/")) return "lesson";
  if (path.startsWith("/path/expansion")) return "lexicon";
  if (path.startsWith("/path")) return "path";
  if (path.startsWith("/review")) return "memory";
  if (path.startsWith("/mistakes")) return "repair";
  if (path.startsWith("/pronunciation")) return "voice";
  if (path.startsWith("/characters")) return "forge";
  if (path.startsWith("/reader")) return "reader";
  if (path.startsWith("/dictionary")) return "lexicon";
  if (path.startsWith("/assessment") || path.startsWith("/exams")) return "trial";
  if (path.startsWith("/analytics")) return "oracle";
  if (path.startsWith("/profile/premium")) return "premium";
  if (path.startsWith("/profile")) return "profile";
  return "awakening";
}

// Each family has its own choreography. All content is readable before JS runs;
// transforms are additive and never change layout or delay an action.
const arrivals: Record<MotionFamily, string[]> = {
  awakening: ["scale(.94)", "scale(1.018)", "scale(1)"],
  path: ["translateX(-18px) scaleX(.96)", "translateX(2px) scaleX(1.005)", "translateX(0) scaleX(1)"],
  lesson: ["translateY(12px)", "translateY(-2px)", "translateY(0)"],
  memory: ["perspective(800px) rotateY(-12deg)", "perspective(800px) rotateY(2deg)", "perspective(800px) rotateY(0deg)"],
  repair: ["translateX(-7px)", "translateX(3px)", "translateX(0)"],
  voice: ["scale(.96)", "scale(1.025)", "scale(1)"],
  forge: ["translateY(-10px) scale(.96)", "translateY(2px) scale(1.01)", "translateY(0) scale(1)"],
  reader: ["perspective(900px) rotateX(9deg)", "perspective(900px) rotateX(-1deg)", "perspective(900px) rotateX(0deg)"],
  lexicon: ["translateX(12px)", "translateX(-1px)", "translateX(0)"],
  trial: ["translateY(-7px) scale(1.035)", "translateY(1px) scale(.995)", "translateY(0) scale(1)"],
  oracle: ["scaleY(.94)", "scaleY(1.015)", "scaleY(1)"],
  profile: ["translateY(8px) scale(.98)", "translateY(-1px) scale(1.005)", "translateY(0) scale(1)"],
  premium: ["scale(.92) rotate(-2deg)", "scale(1.02) rotate(.3deg)", "scale(1) rotate(0deg)"],
};

const accents: Record<MotionFamily, string[]> = {
  awakening: ["rotate(-25deg) scale(.8)", "rotate(8deg) scale(1.06)", "rotate(0deg) scale(1)"],
  path: ["scaleX(.5)", "scaleX(1.06)", "scaleX(1)"],
  lesson: ["translateY(10px) rotate(-4deg)", "translateY(-2px) rotate(1deg)", "translateY(0) rotate(0deg)"],
  memory: ["rotateY(-55deg)", "rotateY(8deg)", "rotateY(0deg)"],
  repair: ["rotate(-8deg) scale(.85)", "rotate(3deg) scale(1.04)", "rotate(0deg) scale(1)"],
  voice: ["scale(.75)", "scale(1.15)", "scale(1)"],
  forge: ["translateY(-8px) rotate(-12deg)", "translateY(2px) rotate(2deg)", "translateY(0) rotate(0deg)"],
  reader: ["rotate(-5deg) translateX(-8px)", "rotate(1deg) translateX(1px)", "rotate(0deg) translateX(0)"],
  lexicon: ["translateY(6px) scale(.9)", "translateY(-1px) scale(1.04)", "translateY(0) scale(1)"],
  trial: ["scale(1.25) rotate(8deg)", "scale(.94) rotate(-2deg)", "scale(1) rotate(0deg)"],
  oracle: ["rotate(-45deg)", "rotate(5deg)", "rotate(0deg)"],
  profile: ["scale(.7)", "scale(1.12)", "scale(1)"],
  premium: ["rotate(-12deg) scale(.8)", "rotate(3deg) scale(1.08)", "rotate(0deg) scale(1)"],
};

export function arrivalFrames(family: MotionFamily, quality: MotionQuality, accent = false): Keyframe[] {
  // The light tier keeps each area's identity while removing deep perspective.
  const light: Record<MotionFamily, string[]> = {
    awakening: ["scale(.98)", "scale(1.005)", "scale(1)"],
    path: ["translateX(-6px) scaleX(.98)", "translateX(1px) scaleX(1)", "translateX(0) scaleX(1)"],
    lesson: ["translateY(5px)", "translateY(-1px)", "translateY(0)"],
    memory: ["translateX(5px) rotate(-.5deg)", "translateX(0) rotate(.1deg)", "translateX(0) rotate(0deg)"],
    repair: ["translateX(-3px)", "translateX(1px)", "translateX(0)"],
    voice: ["scale(.97)", "scale(1.01)", "scale(1)"],
    forge: ["translateY(-4px)", "translateY(1px)", "translateY(0)"],
    reader: ["rotate(.7deg)", "rotate(-.1deg)", "rotate(0deg)"],
    lexicon: ["translateX(4px)", "translateX(-1px)", "translateX(0)"],
    trial: ["scale(1.035)", "scale(.995)", "scale(1)"],
    oracle: ["rotate(-1deg)", "rotate(.1deg)", "rotate(0deg)"],
    profile: ["scaleY(.98)", "scaleY(1.005)", "scaleY(1)"],
    premium: ["rotate(-.7deg) scale(.98)", "rotate(.1deg) scale(1.005)", "rotate(0deg) scale(1)"],
  };
  const transforms = quality === "light" ? light[family] : (accent ? accents : arrivals)[family];
  return transforms.map((transform, index) => ({ transform, opacity: index === 0 ? .55 : 1, offset: index === 1 ? .72 : index / 2 }));
}

export const motionSceneSelectors: Record<MotionFamily, string> = {
  awakening: ".dashboard-holo-card, .dashboard-metric-card, .pillar-signal-row, .realm-node, .dashboard-window-header",
  path: ".path-realm-level, .lesson-node, .path-chapter-header",
  lesson: ".jade-page-title, .jade-block-title, .jade-hanzi, .jade-reveal, .jade-draft-feedback, .lesson-result-screen, .exercise-prompt, .question-prompt",
  memory: ".memory-stat-card, .memory-character, .memory-decoded-meaning, .memory-example-panel, .memory-completion-stats, .review-rating-console",
  repair: ".rem-atlas-heading, .rem-atlas-priority, .rem-atlas-order, .rem-atlas-metrics, .rem-session-heading h1, .rem-attempt-question, .rem-session-result, .rem-recovery-card",
  voice: ".jade-lesson-copy, .pronunciation-battle-report, .pronunciation-focus-word, .pronunciation-quest-steps",
  forge: ".guild-panel, .forge-stage-heading, .prediction-copy, .prediction-feedback, .guild-result-summary, .guild-result-next",
  reader: ".reader-library-book-card, .reader-series-hero, .reader-chapter-list > a, .reader-catalog-heading, .reader-chapter-header, .reader-lookup-card",
  lexicon: ".lex-discovery-card, .lex-entry-heading, .lex-definition, .lex-character-parts, .lex-examples, .lex-mini-word, .lex-jade-panel, .expansion-mission-card",
  trial: ".np-content h2, .np-options, .assessment-question > p, .assessment-result h2, .dungeon-room-node, .dungeon-floor-title, .dungeon-history-card, .dungeon-result-chambers > article, .dungeon-question h1, .placement-question, .placement-result",
  oracle: ".oracle-metrics > article, .oracle-section-heading, .oracle-pillar-list > article, .oracle-gateway-card",
  profile: ".sys-category-list > button, .profile-fieldset, .sys-overview-preview, .sys-reading-preview",
  premium: ".premium-plan-picker, .premium-purchase-heading, .premium-benefits > li, .premium-aftercare, .premium-faq",
};

export const motionAccentSelectors: Record<MotionFamily, string> = {
  awakening: ".hero-core-meter, .mission-sigil, .pillar-signal-core, .path-progress-core",
  path: ".path-banner-compact-seal, .path-level-art, .chapter-spirit-seal",
  lesson: ".quest-transition-core, .result-sigil, .lesson-theory-panel .system-kicker svg",
  memory: ".memory-glyph-orbit, .memory-jade-crystal, .memory-heading-symbol, .memory-completion-sigil",
  repair: ".rem-atlas-seal, .rem-atlas-core, .clear-shield",
  voice: ".jade-seal-base, .jade-seal-orbit, .jade-seal-mic",
  forge: ".guild-glyph-orbit, .prediction-glyph, .fallback-seal",
  reader: ".reader-library-book-card img, .reader-series-hero img",
  lexicon: ".lex-large-hanzi, .lex-heading svg",
  trial: ".dungeon-castle-mark, .dungeon-map-core, .dungeon-result-emblem, .np-art i",
  oracle: ".oracle-hero-emblem, .oracle-metric-icon",
  profile: ".profile-rank-badge, .sys-profile-identity svg",
  premium: ".premium-insignia, .premium-free-icon",
};

export function frameSampleIsSlow(samples: number[]): boolean {
  if (samples.length < 12) return false;
  const ordered = [...samples].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length * .75)]! > 28;
}
