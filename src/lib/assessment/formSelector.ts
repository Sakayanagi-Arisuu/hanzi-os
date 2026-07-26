import type { AssessmentQuestion } from "../../data/assessment";
import type { Skill } from "../../types";

export type AssessmentFormBlueprint = {
  id: string;
  formVersion: string;
  itemCount: number;
  skillTargets: Partial<Record<Skill, number>>;
  allowedReviewStatuses: readonly AssessmentQuestion["reviewStatus"][];
};

export type AssessmentFormSelection =
  | {
      kind: "selected";
      blueprintId: string;
      formVersion: string;
      items: AssessmentQuestion[];
    }
  | {
      kind: "insufficient-bank";
      blueprintId: string;
      formVersion: string;
      availableItemCount: number;
      requiredItemCount: number;
      missingBySkill: Partial<Record<Skill, number>>;
    };

const stableHash = (value: string) => {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

const deterministicOrder = (
  items: readonly AssessmentQuestion[],
  seed: string,
) => [...items].sort((left, right) => {
  const leftHash = stableHash(`${seed}|${left.itemVersion}`);
  const rightHash = stableHash(`${seed}|${right.itemVersion}`);
  return leftHash - rightHash || left.itemVersion.localeCompare(right.itemVersion);
});

/**
 * Selects a reproducible form without reusing an exposure or equivalent group.
 * If the reviewed bank cannot satisfy the whole blueprint, selection fails
 * closed instead of silently serving memorized items.
 */
export const selectAssessmentForm = ({
  items,
  blueprint,
  exposedGroups = new Set<string>(),
  seed,
}: {
  items: readonly AssessmentQuestion[];
  blueprint: AssessmentFormBlueprint;
  exposedGroups?: ReadonlySet<string>;
  seed: string;
}): AssessmentFormSelection => {
  const candidates = deterministicOrder(
    items.filter((item) =>
      !exposedGroups.has(item.exposureGroupId)
      && blueprint.allowedReviewStatuses.includes(item.reviewStatus)
    ),
    seed,
  );
  const selected: AssessmentQuestion[] = [];
  const selectedEquivalentGroups = new Set<string>();
  const missingBySkill: Partial<Record<Skill, number>> = {};

  for (const [skill, target] of Object.entries(blueprint.skillTargets) as Array<
    [Skill, number]
  >) {
    const matching = candidates.filter((item) =>
      item.skill === skill
      && !selectedEquivalentGroups.has(item.equivalentGroupId)
    );
    const chosen = matching.slice(0, target);
    if (chosen.length < target) missingBySkill[skill] = target - chosen.length;
    for (const item of chosen) {
      selected.push(item);
      selectedEquivalentGroups.add(item.equivalentGroupId);
    }
  }

  const selectedVersions = new Set(selected.map((item) => item.itemVersion));
  for (const item of candidates) {
    if (selected.length >= blueprint.itemCount) break;
    if (
      selectedVersions.has(item.itemVersion)
      || selectedEquivalentGroups.has(item.equivalentGroupId)
    ) continue;
    selected.push(item);
    selectedVersions.add(item.itemVersion);
    selectedEquivalentGroups.add(item.equivalentGroupId);
  }

  if (
    Object.keys(missingBySkill).length > 0
    || selected.length !== blueprint.itemCount
  ) {
    return {
      kind: "insufficient-bank",
      blueprintId: blueprint.id,
      formVersion: blueprint.formVersion,
      availableItemCount: candidates.length,
      requiredItemCount: blueprint.itemCount,
      missingBySkill,
    };
  }

  return {
    kind: "selected",
    blueprintId: blueprint.id,
    formVersion: blueprint.formVersion,
    items: deterministicOrder(selected, `${seed}|final`),
  };
};
