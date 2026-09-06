import type { StudioLevel } from "./studioContent";

export const studioLevelForLessonUnit = (unitId: string): StudioLevel => {
  if (unitId === "boot") return "hsk0";
  if (unitId.startsWith("hsk2-")) return "hsk2";
  if (unitId.startsWith("hsk3-")) return "hsk3";
  if (unitId.startsWith("hsk4-")) return "hsk4";
  return "hsk1";
};

export const studioLessonMatchesLevel = (
  unitId: string,
  level: StudioLevel,
) => studioLevelForLessonUnit(unitId) === level;
