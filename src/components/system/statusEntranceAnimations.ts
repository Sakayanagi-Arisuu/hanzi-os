const ENTRANCES = new Set([
  "sysHoloConsoleIn", "sysHoloCoreIn", "sysHoloWingLeftIn", "sysHoloWingRightIn",
]);

export function statusEntranceAnimations(animations: Animation[]): Animation[] {
  return animations.filter(animation =>
    "animationName" in animation
    && ENTRANCES.has(String(animation.animationName))
    && animation.playState === "running"
    && animation.effect?.getComputedTiming().iterations !== Infinity,
  );
}
