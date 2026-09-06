import {
  type PublishedStudioPronunciationGuide,
} from "./publishedStudioPronunciation";
import { loadPublishedStudioPronunciation } from "./publishedStudioClient";
import { createPublishedRuntimeStore } from "./usePublishedRuntimeStore";

const EMPTY = new Map<string, readonly PublishedStudioPronunciationGuide[]>();
const store = createPublishedRuntimeStore(EMPTY, loadPublishedStudioPronunciation);

export const usePublishedStudioPronunciation = () => {
  const { status, value: guides, retry } = store.useStore();
  return { status, guides, retry };
};
