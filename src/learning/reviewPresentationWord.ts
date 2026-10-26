import { RELEASED_WORD_BY_ID } from "../data/curriculum";
import { EDITORIAL_WORD_BY_ID } from "../content/lexicalEditorialCatalog";
import { editorialReviewWordVersion } from "./reviewProtocol";

export const reviewPresentationWord = (wordId: string, version: string) =>
  version === editorialReviewWordVersion(wordId)
    ? EDITORIAL_WORD_BY_ID.get(wordId) : RELEASED_WORD_BY_ID.get(wordId);
