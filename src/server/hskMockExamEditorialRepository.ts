import type { D1Database } from "./d1";
import { ContentStudioRepository } from "./contentStudioRepository";
import {
  createEditorialHskMockExamDefinition,
  getHskMockExamDefinition,
  getHskMockExamDefinitionByBlueprint,
  type HskMockExamDefinition,
} from "./hskMockExamBank";

const EDITORIAL_BLUEPRINT_PREFIX = "hsk-mock-editorial-";

export const loadPublishedEditorialHskMockExamDefinitions = async (
  database: D1Database,
) => {
  const runtime = await new ContentStudioRepository(database).publishedRuntime({
    itemType: "exam_form",
  });
  return runtime.items.map((publication) =>
    createEditorialHskMockExamDefinition(publication)
  ).filter((definition): definition is HskMockExamDefinition => definition !== null);
};

export const resolveHskMockExamDefinition = async (
  database: D1Database,
  level: unknown,
  form: unknown,
) => {
  const builtIn = getHskMockExamDefinition(level, form);
  if (builtIn) return builtIn;
  const definitions = await loadPublishedEditorialHskMockExamDefinitions(database);
  return definitions.find((definition) =>
    definition.examLevel === level
    && definition.formKey === String(form).toLowerCase()
  ) ?? null;
};

export const resolveHskMockExamDefinitionByBlueprint = async (
  database: D1Database,
  blueprintId: string,
) => {
  const builtIn = getHskMockExamDefinitionByBlueprint(blueprintId);
  if (builtIn) return builtIn;
  if (!blueprintId.startsWith(EDITORIAL_BLUEPRINT_PREFIX)) return null;
  const revisionId = blueprintId.slice(EDITORIAL_BLUEPRINT_PREFIX.length);
  if (!revisionId) return null;
  const publication = await new ContentStudioRepository(database)
    .releasedRuntimeRevision(revisionId);
  return publication
    ? createEditorialHskMockExamDefinition(publication)
    : null;
};
