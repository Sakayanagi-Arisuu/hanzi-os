import {
  type PublishedStudioCharacterEntry,
} from "./publishedStudioCharacters";
import { loadPublishedStudioCharacters } from "./publishedStudioClient";
import { createPublishedRuntimeStore } from "./usePublishedRuntimeStore";

const store = createPublishedRuntimeStore<readonly PublishedStudioCharacterEntry[]>(
  [],
  loadPublishedStudioCharacters,
);

export const usePublishedStudioCharacters = () => {
  const { status, value: entries, retry } = store.useStore();
  return { status, entries, retry };
};
