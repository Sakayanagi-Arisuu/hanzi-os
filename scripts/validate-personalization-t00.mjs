import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const localFile = (file) => {
  const path = resolve(root, file);
  const relativePath = relative(root, path).replaceAll("\\", "/");
  assert(!relativePath.startsWith("../") && relativePath !== "..", `Outside root: ${file}`);
  assert(!/^(\.wrangler|docs\/reports|output)(\/|$)/.test(relativePath), `Protected path: ${file}`);
  return path;
};
const readJson = (file) => JSON.parse(readFileSync(localFile(file), "utf8"));
const hashFile = (file) => createHash("sha256").update(readFileSync(localFile(file))).digest("hex");
const unique = (values, label) => check(new Set(values).size === values.length, `Duplicate ${label}`);
const inventory = readJson("docs/PERSONALIZATION_T00_INVENTORY.json");
const fixtures = readJson("docs/PERSONALIZATION_T00_FIXTURES.json");
check(inventory.schemaVersion === 1 && fixtures.schemaVersion === 1, "Unsupported T00 schema");
check(inventory.baselineId === fixtures.baselineId, "Baseline identity mismatch");
check(inventory.authority === "design-audit-only", "Inventory must remain design-only");
check(fixtures.comparison.currentlyExecutableAsAdaptive === false, "T00 cannot claim an adaptive runtime");

const walk = (folder) => readdirSync(localFile(folder), { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(`${folder}/${entry.name}`) : [`${folder}/${entry.name}`]);
const actualRoutes = walk("app").filter((file) => /(?:page\.tsx|route\.ts)$/.test(file)).sort();
const boundRoutes = inventory.serverRoutes.map((route) => route.file).sort();
check(JSON.stringify(actualRoutes) === JSON.stringify(boundRoutes), "Server route inventory changed; audit delta");
const appSource = readFileSync(localFile("src/App.tsx"), "utf8");
const learnerRoutes = [...appSource.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]);
check(JSON.stringify(learnerRoutes) === JSON.stringify(inventory.learnerRoutes), "Learner routes changed; audit delta");
for (const route of inventory.serverRoutes) {
  check(Boolean(route.module), `Unassigned route ${route.file}`);
  if (!existsSync(localFile(route.file))) continue;
  const source = readFileSync(localFile(route.file), "utf8");
  const methods = [...source.matchAll(/export\s+(?:(?:async\s+)?function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)]
    .map((match) => match[1]);
  check(JSON.stringify(methods) === JSON.stringify(route.methods), `Methods changed: ${route.file}`);
  check(hashFile(route.file) === route.sha256, `Route source drift: ${route.file}`);
}
unique(inventory.sourceBindings.map((binding) => binding.file), "source binding");
for (const binding of inventory.sourceBindings) {
  check(existsSync(localFile(binding.file)), `Missing source ${binding.file}`);
  if (existsSync(localFile(binding.file))) check(hashFile(binding.file) === binding.sha256, `Source drift: ${binding.file}`);
}
check(inventory.migrationFiles.every((file) => existsSync(localFile(file))), "Missing historical migration");

const issues = new Set(inventory.issues.map((issue) => issue.id));
const edges = new Set(inventory.edges.map((edge) => edge.id));
check(inventory.learnerRouteCoverage.length === learnerRoutes.length, "Incomplete learner route coverage");
for (const route of inventory.learnerRouteCoverage) {
  check(learnerRoutes.includes(route.route) && route.edges.length > 0, `Unmapped learner route ${route.route}`);
  for (const edge of route.edges) check(edges.has(edge), `${route.route}: unknown edge ${edge}`);
}
const taskPattern = /^(A0[12]|T(?:0[0-9]|1[0-9]))$/;
unique([...inventory.edges.map((edge) => edge.id)], "edge ID");
unique([...inventory.issues.map((issue) => issue.id)], "issue ID");
for (const edge of inventory.edges) {
  for (const field of ["intent", "payloadVersion", "authority", "trigger", "lifecycle", "status"])
    check(typeof edge[field] === "string" && edge[field].length > 0, `${edge.id}: missing ${field}`);
  for (const field of ["producers", "stores", "consumers", "tasks"])
    check(Array.isArray(edge[field]) && edge[field].length > 0, `${edge.id}: empty ${field}`);
  for (const file of [...edge.producers, ...edge.consumers, ...edge.evidence.existingTests])
    check(existsSync(localFile(file)) && inventory.sourceBindings.some((binding) => binding.file === file),
      `${edge.id}: missing path/hash binding ${file}`);
  for (const issue of edge.issues) check(issues.has(issue), `${edge.id}: unknown issue ${issue}`);
  for (const task of edge.tasks) check(taskPattern.test(task), `${edge.id}: unknown task ${task}`);
  check(Boolean(inventory.lifecyclePolicies[edge.lifecyclePolicy]), `${edge.id}: missing lifecycle policy`);
  check(edge.evidence.rerunInT00 === false, `${edge.id}: existing test must not be reported as rerun`);
}
for (const requirement of inventory.requirements) {
  check(requirement.tasks.length > 0 && requirement.edges.length > 0, `Unmapped requirement ${requirement.id}`);
  for (const edge of requirement.edges) check(edges.has(edge), `${requirement.id}: unknown edge ${edge}`);
}
for (const requirement of ["R01", "R02", "R03", "R04", "R05", "R06"])
  check(inventory.requirements.some((entry) => entry.id === requirement), `Missing requirement ${requirement}`);

const core = readJson("content/packages/foundation-2026.08.7/runtime-catalog.json");
check(core.lessons.length === 217, "Core lesson inventory changed");
check(core.lessons.filter((lesson) => lesson.unitId === "boot").length === 4, "HSK0 inventory changed");
for (const [level, expected] of [[1, 40], [2, 40], [3, 55], [4, 78]]) {
  const artifact = readJson(`content/runtime/hsk${level}-level-rich-lessons.json`);
  check(artifact.lessons.length === expected, `HSK${level} rich inventory changed`);
  check(artifact.policy.humanReviewed === false && artifact.policy.masteryEligible === false,
    `HSK${level} review policy changed; re-audit instead of promoting fixture authority`);
}
for (const lesson of inventory.pilot) {
  const source = core.lessons.find((entry) => entry.id === lesson.id);
  check(Boolean(source), `Missing pilot lesson ${lesson.id}`);
  if (source) {
    check(JSON.stringify(source.wordIds) === JSON.stringify(lesson.wordIds), `Word IDs drift: ${lesson.id}`);
    check(JSON.stringify(source.prerequisiteIds) === JSON.stringify(lesson.prerequisiteIds), `Prerequisites drift: ${lesson.id}`);
  }
}

const competencies = new Map(fixtures.competencies.map((entry) => [entry.id, entry]));
unique(fixtures.competencies.map((entry) => entry.id), "competency ID");
const visited = new Set();
const visiting = new Set();
const visit = (id) => {
  if (visiting.has(id)) { errors.push(`Competency cycle: ${id}`); return; }
  if (visited.has(id)) return;
  const competency = competencies.get(id);
  if (!competency) { errors.push(`Missing competency ${id}`); return; }
  visiting.add(id);
  for (const prerequisite of competency.prerequisites) visit(prerequisite);
  visiting.delete(id);
  visited.add(id);
  check(competency.evidencePolicy.status === "requires-human-review", `${id}: policy requires review`);
  check(competency.evidencePolicy.threshold === null, `${id}: unreviewed mastery threshold`);
};
for (const id of competencies.keys()) visit(id);

const units = new Map(fixtures.units.map((unit) => [unit.id, unit]));
const gaps = new Set(fixtures.contentGaps.map((gap) => gap.id));
unique(fixtures.units.map((unit) => unit.id), "unit ID");
const pointerValue = (document, pointer) => pointer.split("/").slice(1)
  .reduce((value, token) => value?.[token.replaceAll("~1", "/").replaceAll("~0", "~")], document);
for (const unit of fixtures.units) {
  check(competencies.has(unit.competencyId), `${unit.id}: unknown competency`);
  check(unit.humanReviewed === false && unit.masteryEligible === false, `${unit.id}: false authority`);
  check(Number.isFinite(unit.estimatedSeconds) && unit.estimatedSeconds > 0, `${unit.id}: invalid time budget`);
  for (const gap of unit.requiresGaps) check(gaps.has(gap), `${unit.id}: missing gap ${gap}`);
  if (unit.availability === "missing-content") {
    check(unit.source === null && unit.requiresGaps.length > 0, `${unit.id}: fabricated content source`);
    continue;
  }
  const source = readJson(unit.source.file);
  if (unit.availability === "existing-local-source") {
    const lesson = source.lessons.find((entry) => entry.lessonId === unit.source.lessonId);
    const section = lesson?.[unit.source.section];
    check(Array.isArray(section) && section.length > 0, `${unit.id}: missing source section`);
    if (unit.source.entryId) check(section?.some((entry) => entry.id === unit.source.entryId), `${unit.id}: missing source entry`);
    for (const context of unit.contextSections) check(Array.isArray(lesson?.[context]), `${unit.id}: missing context ${context}`);
  } else {
    const document = pointerValue(source, unit.source.documentPointer);
    const parentPointer = unit.source.documentPointer.replace(/\/lessonPages$/, "");
    check(pointerValue(source, parentPointer)?.lessonId === unit.source.lessonId, `${unit.id}: wrong document owner`);
    for (const id of [...unit.source.pageIds, ...unit.contextPageIds])
      check(document?.pages.some((page) => page.id === id), `${unit.id}: missing context page ${id}`);
  }
}

const allFixtures = [...fixtures.needs, ...fixtures.contexts];
unique(allFixtures.map((fixture) => fixture.id), "fixture ID");
const fixtureIds = new Set(allFixtures.map((fixture) => fixture.id));
check(fixtures.needs.length === 4, "Four distinct learner needs required");
check(new Set(fixtures.needs.map((fixture) => JSON.stringify(fixture.targetPlan))).size === 4, "Needs differ only by name");
for (const fixture of allFixtures) {
  if (fixture.extends) check(fixtureIds.has(fixture.extends), `${fixture.id}: missing base fixture`);
  for (const id of [...fixture.targetPlan, ...fixture.baselineExpected.fallbackUnits])
    check(units.has(id), `${fixture.id}: missing unit ${id}`);
  for (const gap of fixture.baselineExpected.missing) check(gaps.has(gap), `${fixture.id}: missing gap ${gap}`);
  if (fixture.input.durationSeconds) {
    const duration = fixture.targetPlan.reduce((total, id) => total + (units.get(id)?.estimatedSeconds ?? 0), 0);
    check(duration + (fixture.input.transitionBudgetSeconds ?? 0) <= fixture.input.durationSeconds, `${fixture.id}: time budget exceeded`);
  }
  if (fixture.input.microphone === false) check(fixture.targetPlan.every((id) => units.get(id)?.modality !== "speech"), `${fixture.id}: requires microphone`);
  if (fixture.input.online === false) {
    const cached = new Set(fixture.input.cachedUnitIds ?? []);
    for (const id of [...fixture.targetPlan, ...fixture.baselineExpected.fallbackUnits])
      check(cached.has(id), `${fixture.id}: offline unit is not prepared: ${id}`);
  }
}
for (const fixture of fixtures.lifecycleFixtures) {
  check(fixture.implemented === false, `${fixture.id}: lifecycle design is not implemented`);
  for (const edge of fixture.edgeIds) check(edges.has(edge), `${fixture.id}: missing edge ${edge}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`T00 baseline valid: ${learnerRoutes.length} learner routes, ${actualRoutes.length} server entries, ${edges.size} edges, ${units.size} unit references, ${allFixtures.length} learning fixtures, ${fixtures.lifecycleFixtures.length} lifecycle fixtures. Design only; runtime/D1/browser/device not evaluated.`);
}
