import {
  type PublishedStudioLesson,
  type PublishedStudioLessonEnhancement,
} from "./publishedStudioLessons";
import { loadPublishedStudioLessons } from "./publishedStudioClient";
import { createPublishedRuntimeStore } from "./usePublishedRuntimeStore";

type PublishedLessonValue = {
  lessons: ReadonlyMap<string, PublishedStudioLesson>;
  enhancements: ReadonlyMap<string, PublishedStudioLessonEnhancement>;
};

const EMPTY = new Map<string, PublishedStudioLesson>();
const EMPTY_ENHANCEMENTS = new Map<string, PublishedStudioLessonEnhancement>();
const EMPTY_VALUE: PublishedLessonValue = {
  lessons: EMPTY,
  enhancements: EMPTY_ENHANCEMENTS,
};
const store = createPublishedRuntimeStore(EMPTY_VALUE, loadPublishedStudioLessons);

export const refreshPublishedStudioLessons = store.refresh;

export const getPublishedStudioLessonSnapshotForTests = () => {
  const state = store.getSnapshot();
  return { status: state.status, ...state.value };
};

export const resetPublishedStudioLessonCacheForTests = store.reset;

export const usePublishedStudioLessons = () => {
  const { status, value, retry } = store.useStore();
  return { status, ...value, retry };
};
