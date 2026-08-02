import type { SystemSignalType } from "../system/systemSignals";

export type SoundCueId =
  | "system.boot" | "system.online" | "system.open" | "system.close"
  | "ui.select" | "ui.navigate" | "ui.confirm" | "ui.warning"
  | "quest.scan" | "quest.accepted" | "quest.activated"
  | "lesson.start" | "learning.correct" | "learning.retry" | "lesson.clear"
  | "path.unlock" | "review.recall" | "review.queue-clear" | "mistake.resolved"
  | "level-check.gate-open" | "level-check.result" | "rank.threshold" | "journey.promotion"
  | "voice.play-start" | "voice.play-end" | "voice.record-arm" | "voice.record-start"
  | "voice.record-stop" | "voice.processing" | "voice.result" | "voice.error"
  | "state.saved" | "state.offline" | "state.sync" | "state.warning";

export type CueTone = readonly [frequency: number, offset: number, duration: number, wave?: OscillatorType];
export type CueDefinition = {
  channel: "effects";
  tones: readonly CueTone[];
  gain: number;
  cooldown: number;
  duration: number;
  priority: 1 | 2 | 3;
  duckPolicy: "follow-voice";
  visualEnvelope: readonly [attack: number, release: number, intensity: number];
  sweep?: number;
};

const tone = (tones: readonly CueTone[], gain = 0.12, cooldown = 80, priority: 1 | 2 | 3 = 1, sweep?: number): CueDefinition => {
  const lastTone = tones[tones.length - 1]!;
  const duration = lastTone[1] + lastTone[2] + .025;
  return {
    channel: "effects",
    tones,
    gain,
    cooldown,
    duration,
    priority,
    duckPolicy: "follow-voice",
    visualEnvelope: [.018, duration, Math.min(1, gain * 5)],
    ...(sweep ? { sweep } : {}),
  };
};

export const CUE_CATALOG: Record<SoundCueId, CueDefinition> = {
  "system.boot": tone([[72, 0, .42, "sine"], [144, .08, .52, "triangle"], [288, .22, .48], [576, .42, .42]], .18, 1200, 3, 1.12),
  "system.online": tone([[110, 0, .26], [220, .06, .32, "triangle"], [440, .16, .34], [880, .28, .23]], .16, 900, 3, 1.06),
  "system.open": tone([[130, 0, .22], [260, .05, .28, "triangle"], [520, .14, .31]], .14, 250, 2, 1.05),
  "system.close": tone([[520, 0, .12], [260, .07, .18, "triangle"]], .11, 160, 2, .96),
  "ui.select": tone([[660, 0, .055], [990, .025, .055]], .07, 42),
  "ui.navigate": tone([[300, 0, .08, "triangle"], [610, .055, .13]], .08, 65),
  "ui.confirm": tone([[410, 0, .1, "triangle"], [820, .07, .16], [1230, .13, .18]], .1, 90, 2),
  "ui.warning": tone([[180, 0, .14, "sawtooth"], [145, .18, .18, "sawtooth"]], .09, 350, 2),
  "quest.scan": tone([[230, 0, .18], [460, .12, .14], [920, .22, .12]], .08, 300, 2, 1.08),
  "quest.accepted": tone([[294, 0, .18, "triangle"], [440, .1, .2], [587, .22, .24]], .13, 500, 2),
  "quest.activated": tone([[147, 0, .3], [294, .08, .35, "triangle"], [587, .22, .34], [1174, .36, .26]], .16, 700, 3, 1.08),
  "lesson.start": tone([[196, 0, .22, "triangle"], [392, .09, .24], [784, .2, .2]], .12, 600, 2),
  "learning.correct": tone([[523, 0, .1], [784, .06, .14], [1047, .13, .18]], .1, 120, 2),
  "learning.retry": tone([[330, 0, .12, "triangle"], [247, .1, .16]], .075, 150),
  "lesson.clear": tone([[196, 0, .32], [392, .08, .36, "triangle"], [784, .2, .4], [1175, .36, .38]], .17, 1000, 3, 1.06),
  "path.unlock": tone([[262, 0, .24], [523, .12, .26], [1047, .26, .3]], .15, 800, 3, 1.08),
  "review.recall": tone([[392, 0, .1], [587, .08, .14]], .08, 100),
  "review.queue-clear": tone([[330, 0, .22], [660, .1, .27], [990, .22, .3]], .14, 800, 3),
  "mistake.resolved": tone([[220, 0, .16, "triangle"], [440, .08, .2], [880, .18, .2]], .11, 300, 2),
  "level-check.gate-open": tone([[98, 0, .36], [196, .1, .38], [392, .25, .42]], .16, 900, 3, 1.09),
  "level-check.result": tone([[262, 0, .28], [392, .12, .3], [523, .24, .34], [1047, .4, .32]], .17, 1200, 3),
  "rank.threshold": tone([[147, 0, .35], [293, .08, .42, "triangle"], [587, .2, .46], [880, .34, .42]], .18, 1500, 3, 1.05),
  "journey.promotion": tone([[110, 0, .45], [220, .08, .5, "triangle"], [440, .2, .52], [880, .36, .48], [1320, .52, .34]], .19, 1800, 3, 1.06),
  "voice.play-start": tone([[440, 0, .07], [880, .05, .09]], .065, 80),
  "voice.play-end": tone([[880, 0, .07], [440, .05, .1]], .055, 80),
  "voice.record-arm": tone([[180, 0, .12, "triangle"], [360, .11, .12]], .08, 250, 2),
  "voice.record-start": tone([[740, 0, .08], [1110, .08, .1]], .09, 250, 2),
  "voice.record-stop": tone([[660, 0, .08], [330, .07, .12]], .08, 250, 2),
  "voice.processing": tone([[247, 0, .1], [370, .07, .1], [555, .14, .13]], .07, 260),
  "voice.result": tone([[392, 0, .1], [784, .08, .16], [1175, .17, .16]], .1, 280, 2),
  "voice.error": tone([[220, 0, .12, "sawtooth"], [174, .15, .18, "triangle"]], .08, 320, 2),
  "state.saved": tone([[523, 0, .08], [698, .07, .12]], .06, 250),
  "state.offline": tone([[175, 0, .18, "triangle"], [131, .14, .22]], .07, 800, 2),
  "state.sync": tone([[262, 0, .12, "triangle"], [523, .1, .16], [784, .2, .17]], .08, 500, 2),
  "state.warning": tone([[196, 0, .14, "sawtooth"], [165, .18, .2, "sawtooth"]], .085, 500, 2),
};

export const SIGNAL_CUE_MAP: Partial<Record<SystemSignalType, SoundCueId>> = {
  "system.boot": "system.boot",
  "system.online": "system.online",
  "system.panel-opened": "system.open",
  "system.panel-closed": "system.close",
  "quest.scan": "quest.scan",
  "quest.activated": "quest.activated",
  "lesson.started": "lesson.start",
  "lesson.completed": "lesson.clear",
  "learning.correct": "learning.correct",
  "learning.retry": "learning.retry",
  "path.unlocked": "path.unlock",
  "review.recalled": "review.recall",
  "review.queue-cleared": "review.queue-clear",
  "mistake.resolved": "mistake.resolved",
  "level-check.started": "level-check.gate-open",
  "level-check.completed": "level-check.result",
  "rank.threshold-reached": "rank.threshold",
  "journey.title-unlocked": "rank.threshold",
  "journey.promoted": "journey.promotion",
  "voice.playback-started": "voice.play-start",
  "voice.playback-ended": "voice.play-end",
  "voice.record-armed": "voice.record-arm",
  "voice.record-started": "voice.record-start",
  "voice.record-stopped": "voice.record-stop",
  "voice.processing": "voice.processing",
  "voice.result": "voice.result",
  "voice.permission-denied": "voice.error",
  "voice.error": "voice.error",
  "state.saved": "state.saved",
  "state.offline": "state.offline",
  "state.restored": "state.sync",
  "state.warning": "state.warning",
};
