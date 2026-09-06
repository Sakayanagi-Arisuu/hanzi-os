import type { CourseUnit } from "../types";
import { getHskLessonPathId, type HskCurriculumPathId } from "../data/hskCurriculumGraph";
import { HSK_LEARNING_PATHS, type HskLearningPath } from "../data/hskLearningPaths";

export type PathCatalogGroup = {
  path: HskLearningPath;
  units: CourseUnit[];
};

/**
 * Groups every supplied course unit without applying unlock or placement
 * visibility. Access is a separate concern handled by learning authority.
 */
export const groupCourseUnitsByHsk = (
  units: readonly CourseUnit[],
): PathCatalogGroup[] => {
  const unitsByPath = new Map<HskCurriculumPathId, CourseUnit[]>();
  for (const unit of units) {
    const lessonPathIds = new Set(unit.lessons.map((lesson) =>
      getHskLessonPathId(lesson.id)
    ).filter((pathId): pathId is HskCurriculumPathId => pathId !== null));
    if (lessonPathIds.size > 1) {
      throw new Error(`Course unit ${unit.id} spans multiple HSK paths.`);
    }
    const pathId = [...lessonPathIds][0];
    if (!pathId) continue;
    const current = unitsByPath.get(pathId) ?? [];
    current.push(unit);
    unitsByPath.set(pathId, current);
  }
  return HSK_LEARNING_PATHS.map((path) => ({
    path,
    units: unitsByPath.get(path.id) ?? [],
  })).filter((group) => group.units.length > 0);
};
