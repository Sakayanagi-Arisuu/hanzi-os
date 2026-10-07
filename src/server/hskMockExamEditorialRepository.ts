import type { D1Database } from "./d1";
import { ContentStudioRepository, type PublishedStudioRuntimeItem } from "./contentStudioRepository";
import { canonicalStudioJson, studioSha256 } from "../content/studioContent";
import {
  createEditorialHskMockExamDefinition,
  getHskMockExamDefinition,
  getHskMockExamDefinitionByBlueprint,
  type HskMockExamDefinition,
} from "./hskMockExamBank";

const EDITORIAL_BLUEPRINT_PREFIX = "hsk-mock-editorial-";

// Public packages omit exam answers. Resolve the exact released source only
// inside the server; never add private fields to the public runtime projection.
const loadPinnedEditorialItems = async (
  repository: ContentStudioRepository,
  revisionIds: readonly string[],
) => {
  const publications = await repository.releasedRuntimeRevisions(revisionIds);
  const items: PublishedStudioRuntimeItem[] = [];
  for (const publication of publications) {
    if (publication.itemType !== "exam_item") continue;
    const source = await repository.getRevision(publication.revisionId);
    if (
      source.itemType !== "exam_item"
      || (source.workflowState !== "published" && source.workflowState !== "archived")
      || source.contentSha256 !== publication.contentSha256
      || await studioSha256(canonicalStudioJson(source.content)) !== publication.contentSha256
    ) throw new Error("Pinned assessment source failed its immutable digest fence.");
    items.push({ ...publication, content: source.content });
  }
  return items;
};

export async function loadPublishedEditorialExamItems(database: D1Database) {
  const repository = new ContentStudioRepository(database);
  const runtime = await repository.publishedRuntime({itemType: 'exam_item'});
  return loadPinnedEditorialItems(repository, runtime.items.map(item => item.revisionId));
}

export const loadPublishedEditorialHskMockExamDefinitions = async (
  database: D1Database,
) => {
  const repository = new ContentStudioRepository(database);
  const runtime = await repository.publishedRuntime({
    itemType: "exam_form",
  });
  const pinnedRevisionIds = runtime.items.flatMap((publication) =>
    Array.isArray(publication.content.itemStableKeys)
      ? publication.content.itemStableKeys.filter(
        (key): key is string => typeof key === "string",
      )
      : []
  );
  const editorialItems = await loadPinnedEditorialItems(repository, pinnedRevisionIds);
  return runtime.items.map((publication) =>
    createEditorialHskMockExamDefinition(publication, editorialItems)
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
  if (!publication) return null;
  const itemRevisionIds = Array.isArray(publication.content.itemStableKeys)
    ? publication.content.itemStableKeys.filter(
      (key): key is string => typeof key === "string",
    )
    : [];
  const editorialItems = await loadPinnedEditorialItems(
    new ContentStudioRepository(database), itemRevisionIds,
  );
  return createEditorialHskMockExamDefinition(publication, editorialItems);
};
