import {
  HSK_MOCK_EXAM_DEFINITIONS,
  HSK_MOCK_EXAM_LEVELS,
  HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS,
} from "../../../../src/server/hskMockExamBank";
import { getD1Database } from "../../../../src/server/d1";
import { loadPublishedEditorialHskMockExamDefinitions } from "../../../../src/server/hskMockExamEditorialRepository";
import { publicHskMockExamDefinition } from "../../../../src/server/hskMockExamRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";
import { MockExamAccessRepository } from '../../../../src/server/mockExamAccessRepository';
import { mockExamTier, type MockExamAccessTier } from '../../../../src/assessment/mockExamAccess';
import { requestPremiumAccess } from '../../../../src/server/premiumAccess';

export const dynamic = "force-dynamic";

export async function GET(request?: Request) {
  let editorialDefinitions = [] as typeof HSK_MOCK_EXAM_DEFINITIONS[number][];
  let rules = new Map<string, MockExamAccessTier>();
  let premiumActive = false;
  let accessAvailable = false;
  try {
    const database = await getD1Database();
    editorialDefinitions = await loadPublishedEditorialHskMockExamDefinitions(
      database,
    );
    rules = await new MockExamAccessRepository(database).rules();
    accessAvailable = true;
    premiumActive = request ? await requestPremiumAccess(request, database) : false;
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
  ].sort((left,right)=>left.examLevel.localeCompare(right.examLevel) || left.formKey.localeCompare(right.formKey));
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
      forms: definitions.map(definition => {
        const accessTier = mockExamTier(definition.formKey, rules.get(`${definition.examLevel}:${definition.formKey}`) ?? definition.accessTier);
        return { ...publicHskMockExamDefinition(definition), accessTier,
          locked: !accessAvailable || (accessTier === 'premium' && !premiumActive) };
      }),
      accessAvailable,
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
