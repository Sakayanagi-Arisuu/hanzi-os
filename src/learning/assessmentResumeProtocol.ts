export const ASSESSMENT_RESUME_VERSION = 4 as const;
export const ASSESSMENT_RESUME_FORM_FAMILY_ID =
  "diagnostic-foundation" as const;

export type AssessmentResumeItemBinding = {
  id: string;
  itemVersion: string;
};

export type AssessmentResumeV4 = {
  version: typeof ASSESSMENT_RESUME_VERSION;
  contentVersion: string;
  formVersion: string;
  blueprintId: string;
  sessionId: string;
  items: AssessmentResumeItemBinding[];
  index: number;
  selected: string | null;
  checked: boolean;
};

/**
 * The minimum answer-free shape needed to restore a compatibility assessment
 * session. The parser deliberately does not depend on the answer-bearing item
 * bank, so authenticated assessment clients cannot acquire answer keys through
 * this shared persistence protocol.
 */
export type AssessmentResumeItem = {
  id: string;
  itemVersion: string;
  formFamilyId: string;
  options: readonly string[];
};

export type ResolvedAssessmentResume<
  Item extends AssessmentResumeItem = AssessmentResumeItem,
> = {
  session: AssessmentResumeV4;
  items: Item[];
};

const ASSESSMENT_RESUME_KEYS = [
  "version",
  "contentVersion",
  "formVersion",
  "blueprintId",
  "sessionId",
  "items",
  "index",
  "selected",
  "checked",
] as const;

const ASSESSMENT_ITEM_BINDING_KEYS = ["id", "itemVersion"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
) => {
  const allowed = new Set(required);
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key))
    && keys.every((key) => allowed.has(key));
};

const isBoundedString = (
  value: unknown,
  maximumLength: number,
): value is string => typeof value === "string"
  && value.length > 0
  && value.length <= maximumLength;

const isSafeCount = (value: unknown, maximum: number): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum;

const isNullableBoundedString = (
  value: unknown,
  maximumLength: number,
): value is string | null => value === null
  || isBoundedString(value, maximumLength);

export const parseAssessmentResume = <
  Item extends AssessmentResumeItem,
>({
  value,
  contentVersion,
  formVersion,
  blueprintId,
  itemCount,
  bank,
}: {
  value: unknown;
  contentVersion: string;
  formVersion: string;
  blueprintId: string;
  itemCount: number;
  bank: readonly Item[];
}): ResolvedAssessmentResume<Item> | null => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ASSESSMENT_RESUME_KEYS)
    || value.version !== ASSESSMENT_RESUME_VERSION
    || value.contentVersion !== contentVersion
    || value.formVersion !== formVersion
    || value.blueprintId !== blueprintId
    || !isBoundedString(value.sessionId, 240)
    || !Array.isArray(value.items)
    || value.items.length !== itemCount
    || !isSafeCount(value.index, itemCount - 1)
    || !isNullableBoundedString(value.selected, 1_000)
    || typeof value.checked !== "boolean"
  ) return null;

  const bankById = new Map(bank.map((item) => [item.id, item]));
  const resolvedItems: Item[] = [];
  const seenIds = new Set<string>();
  const seenVersions = new Set<string>();
  for (const binding of value.items) {
    if (
      !isRecord(binding)
      || !hasExactKeys(binding, ASSESSMENT_ITEM_BINDING_KEYS)
      || !isBoundedString(binding.id, 160)
      || !isBoundedString(binding.itemVersion, 200)
      || seenIds.has(binding.id)
      || seenVersions.has(binding.itemVersion)
    ) return null;
    const item = bankById.get(binding.id);
    if (
      !item
      || item.itemVersion !== binding.itemVersion
      || item.formFamilyId !== ASSESSMENT_RESUME_FORM_FAMILY_ID
    ) return null;
    seenIds.add(binding.id);
    seenVersions.add(binding.itemVersion);
    resolvedItems.push(item);
  }

  const selected = value.selected as string | null;
  const current = resolvedItems[Number(value.index)];
  if (
    (value.checked && !selected)
    || (selected !== null && !current.options.includes(selected))
  ) return null;

  return {
    session: value as AssessmentResumeV4,
    items: resolvedItems,
  };
};
