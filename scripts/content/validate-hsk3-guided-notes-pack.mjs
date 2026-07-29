import {
  assertValidHsk3GuidedNotesPackBundle,
  loadHsk3GuidedNotesPackBundle,
} from "../../src/content/hsk3GuidedNotesPack.mjs";

const result = assertValidHsk3GuidedNotesPackBundle(
  loadHsk3GuidedNotesPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
