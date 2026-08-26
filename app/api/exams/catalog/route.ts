import {
  HSK_MOCK_EXAM_DEFINITIONS,
  HSK_MOCK_EXAM_LEVELS,
  HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS,
} from "../../../../src/server/hskMockExamBank";
import { getD1Database } from "../../../../src/server/d1";
import { loadPublishedEditorialHskMockExamDefinitions } from "../../../../src/server/hskMockExamEditorialRepository";
import { publicHskMockExamDefinition } from "../../../../src/server/hskMockExamRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  let editorialDefinitions = [] as typeof HSK_MOCK_EXAM_DEFINITIONS[number][];
  try {
    editorialDefinitions = await loadPublishedEditorialHskMockExamDefinitions(
      await getD1Database(),
    );
  } catch {
    // Built-in forms stay playable if the optional editorial projection is unavailable.
  }
  const occupied = new Set(HSK_MOCK_EXAM_DEFINITIONS.map((definition) =>
    `${definition.examLevel}:${definition.formKey}`
  ));
  const definitions = [
    ...HSK_MOCK_EXAM_DEFINITIONS,
    ...editorialDefinitions.filter((definition) =>
      !occupied.has(`${definition.examLevel}:${definition.formKey}`)
    ),
  ];
  const levels = Object.fromEntries(HSK_MOCK_EXAM_LEVELS.map((level) => [
    level,
    {
      forms: definitions.filter((definition) => definition.examLevel === level).length,
      playableItems: definitions
        .filter((definition) => definition.examLevel === level)
        .reduce((sum, definition) => sum + definition.blueprint.itemCount, 0),
      sourceItems: HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS[level],
    },
  ]));
  return Response.json(
    {
      forms: definitions.map(publicHskMockExamDefinition),
      summary: {
        forms: definitions.length,
        playableItems: definitions.reduce(
          (sum, definition) => sum + definition.blueprint.itemCount,
          0,
        ),
        sourceItems: Object.values(HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS)
          .reduce((sum, count) => sum + count, 0),
        levels,
      },
    },
    { headers: noStoreJsonHeaders },
  );
}
