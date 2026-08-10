import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const BENCHMARK = readFileSync(
  new URL("../../docs/CHINESESKILL_BENCHMARK.md", import.meta.url),
  "utf8",
);
const MASTER_PLAN = readFileSync(
  new URL("../../docs/RESTRUCTURE_MASTER_PLAN.md", import.meta.url),
  "utf8",
);

const SOURCE_HEADER =
  "| Mã nguồn | Nguồn | Loại bằng chứng | Trạng thái/ngày truy cập | Dùng để xác nhận và giới hạn |";
const CAPABILITY_HEADER =
  "| Mã | Năng lực | Phân loại | Bằng chứng và giới hạn | Nguồn | Task đích | Tiêu chí nghiệm thu HANZI.OS |";
const GAP_HEADER =
  "| Mã | Năng lực/gap | Bằng chứng HANZI.OS hiện tại | Trạng thái | Trace nguồn/capability | Task đích và acceptance |";

const EVIDENCE_CLASSES = new Set([
  "OBSERVED",
  "OFFICIAL_CLAIM",
  "UNVERIFIED",
  "OUT_OF_SCOPE",
]);
const GAP_STATUSES = new Set(["Keep", "Rebuild", "New", "Defer"]);
const SOURCE_KINDS = new Set([
  "Official site claim",
  "Direct public observation",
  "Official support claim, historical",
  "Official-store claim",
  "Official policy claim",
  "Historical secondary",
  "Unverified developer/community claim",
  "Secondary/historical",
  "Secondary/unverified",
  "Internal audited baseline",
  "Internal scope contract",
]);

function parseMarkdownRow(line: string): string[] {
  if (!line.startsWith("|") || !line.endsWith("|")) {
    throw new Error(`Dòng không phải markdown table hợp lệ: ${line}`);
  }

  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function parseTable(markdown: string, exactHeader: string): string[][] {
  const lines = markdown.split(/\r?\n/u);
  const headerIndex = lines.indexOf(exactHeader);
  if (headerIndex === -1) {
    throw new Error(`Không tìm thấy header canonical: ${exactHeader}`);
  }

  const separator = lines[headerIndex + 1];
  if (!separator || !/^\|(?:\s*---\s*\|)+$/u.test(separator)) {
    throw new Error(`Thiếu separator ngay sau header: ${exactHeader}`);
  }

  const rows: string[][] = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line?.startsWith("|")) break;
    rows.push(parseMarkdownRow(line));
  }
  return rows;
}

function inlineCodeTokens(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
}

function taskTokens(cell: string): string[] {
  return [...cell.matchAll(/\bT\d{3}\b/gu)].map((match) => match[0]);
}

function plainCell(cell: string): string {
  return cell.replaceAll("**", "").replaceAll("`", "").trim();
}

function sequentialIds(prefix: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`,
  );
}

function validateAcceptance(cell: string): string[] {
  const errors: string[] = [];
  if (plainCell(cell).length < 40) errors.push("acceptance quá ngắn");
  if (/\b(?:TODO|TBD)\b|^—$/iu.test(plainCell(cell))) {
    errors.push("acceptance còn placeholder");
  }
  return errors;
}

function validateGapTrace(
  cell: string,
  sourceIds: Set<string>,
  capabilityIds: Set<string>,
): string[] {
  const traces = inlineCodeTokens(cell);
  if (traces.length === 0) return ["gap không có trace nguồn/capability"];

  return traces.flatMap((trace) =>
    sourceIds.has(trace) || capabilityIds.has(trace)
      ? []
      : [`trace không tồn tại: ${trace}`],
  );
}

function hasThresholdOwner(
  acceptance: string,
  taskCell: string,
  masterTaskLines: Map<string, string>,
): boolean {
  if (!/\b(?:ngưỡng|target|budget|calibrat\w*)\b/iu.test(acceptance)) return true;

  const tasks = taskTokens(taskCell);
  return (
    tasks.includes("T010") ||
    tasks.some((task) => /\bT010\b/u.test(masterTaskLines.get(task) ?? ""))
  );
}

function validateCapabilityRow(
  row: string[],
  sourceIds: Set<string>,
  sourceKinds: Map<string, string>,
  taskIds: Set<string>,
): string[] {
  const errors: string[] = [];
  if (row.length !== 7) return [`capability có ${row.length} cột thay vì 7`];

  const evidenceClass = plainCell(row[2]);
  if (!EVIDENCE_CLASSES.has(evidenceClass)) {
    errors.push(`nhãn bằng chứng không hợp lệ: ${evidenceClass}`);
  }

  const sources = inlineCodeTokens(row[4]);
  if (sources.length === 0) errors.push("capability không có nguồn");
  for (const source of sources) {
    if (!sourceIds.has(source)) errors.push(`nguồn không tồn tại: ${source}`);
  }

  const selectedSourceKinds = sources.flatMap((source) => {
    const kind = sourceKinds.get(source);
    return kind ? [kind] : [];
  });
  const hasRequiredEvidence =
    (evidenceClass === "OBSERVED" &&
      selectedSourceKinds.includes("Direct public observation")) ||
    (evidenceClass === "OFFICIAL_CLAIM" &&
      selectedSourceKinds.some((kind) => kind.startsWith("Official"))) ||
    (evidenceClass === "UNVERIFIED" &&
      selectedSourceKinds.some((kind) => /Unverified/iu.test(kind))) ||
    (evidenceClass === "OUT_OF_SCOPE" && sources.includes("VISION-SCOPE"));
  if (EVIDENCE_CLASSES.has(evidenceClass) && !hasRequiredEvidence) {
    errors.push(`nguồn không hỗ trợ nhãn bằng chứng: ${evidenceClass}`);
  }

  const tasks = taskTokens(row[5]);
  if (tasks.length === 0) errors.push("capability không có task đích");
  for (const task of tasks) {
    if (!taskIds.has(task)) errors.push(`task không tồn tại: ${task}`);
  }

  errors.push(...validateAcceptance(row[6]));
  return errors;
}

describe("ChineseSkill benchmark traceability contract", () => {
  const sourceRows = parseTable(BENCHMARK, SOURCE_HEADER);
  const capabilityRows = parseTable(BENCHMARK, CAPABILITY_HEADER);
  const gapRows = parseTable(BENCHMARK, GAP_HEADER);
  const sourceIds = new Set(sourceRows.flatMap((row) => inlineCodeTokens(row[0])));
  const sourceKinds = new Map<string, string>();
  for (const row of sourceRows) {
    const [sourceId] = inlineCodeTokens(row[0]);
    if (sourceId) sourceKinds.set(sourceId, plainCell(row[2]));
  }
  const capabilityIds = new Set(sequentialIds("CAP", 18));
  const masterTaskLines = new Map<string, string>();
  for (const line of MASTER_PLAN.split(/\r?\n/u)) {
    const task = line.match(/^- \*\*(T\d{3}) —/u)?.[1];
    if (task) masterTaskLines.set(task, line);
  }
  const masterTaskIds = new Set(
    [...MASTER_PLAN.matchAll(/^- \*\*(T\d{3}) —/gmu)].map((match) => match[1]),
  );

  it("locks a stable, linked source ledger", () => {
    expect(sourceRows).toHaveLength(13);
    expect(sourceIds.size).toBe(sourceRows.length);

    for (const row of sourceRows) {
      expect(row).toHaveLength(5);
      expect(inlineCodeTokens(row[0])).toHaveLength(1);
      expect(row[1]).toMatch(/\[[^\]]+\]\((?:https:\/\/|[A-Z0-9_./-]+\.md)/u);
      expect(SOURCE_KINDS.has(plainCell(row[2]))).toBe(true);
      expect(plainCell(row[3]).length).toBeGreaterThanOrEqual(10);
      expect(plainCell(row[4]).length).toBeGreaterThanOrEqual(30);
    }
  });

  it("binds every canonical capability to valid evidence, tasks and acceptance", () => {
    expect(masterTaskIds.size).toBe(100);
    expect([...masterTaskIds].sort()).toEqual(sequentialIds("T", 100).map((id) => id.replace("-", "")));
    expect(capabilityRows).toHaveLength(18);
    expect(capabilityRows.map((row) => plainCell(row[0]))).toEqual(
      sequentialIds("CAP", 18),
    );

    const representedClasses = new Set<string>();
    for (const row of capabilityRows) {
      representedClasses.add(plainCell(row[2]));
      expect(validateCapabilityRow(row, sourceIds, sourceKinds, masterTaskIds)).toEqual([]);
      expect(hasThresholdOwner(row[6], row[5], masterTaskLines)).toBe(true);
    }
    expect(representedClasses).toEqual(EVIDENCE_CLASSES);
  });

  it("traces every HANZI.OS gap to the benchmark and an observable task outcome", () => {
    expect(gapRows).toHaveLength(36);
    expect(gapRows.map((row) => plainCell(row[0]))).toEqual(sequentialIds("GAP", 36));

    const traceIds = new Set<string>();
    for (const row of gapRows) {
      expect(row).toHaveLength(6);
      expect(GAP_STATUSES.has(plainCell(row[3]))).toBe(true);

      const traces = inlineCodeTokens(row[4]);
      expect(traces.length).toBeGreaterThan(0);
      expect(validateGapTrace(row[4], sourceIds, capabilityIds)).toEqual([]);
      for (const trace of traces) {
        traceIds.add(trace);
      }

      const tasks = taskTokens(row[5]);
      expect(tasks.length).toBeGreaterThan(0);
      for (const task of tasks) expect(masterTaskIds.has(task)).toBe(true);
      expect(validateAcceptance(row[5])).toEqual([]);
      expect(hasThresholdOwner(row[5], row[5], masterTaskLines)).toBe(true);
    }

    for (const capabilityId of sequentialIds("CAP", 18)) {
      expect(traceIds.has(capabilityId)).toBe(true);
    }
  });

  it("fails closed for invalid classification, references and acceptance", () => {
    const base = [...capabilityRows[0]];

    const invalidClass = [...base];
    invalidClass[2] = "`MARKETING_FACT`";
    expect(validateCapabilityRow(invalidClass, sourceIds, sourceKinds, masterTaskIds)).toContain(
      "nhãn bằng chứng không hợp lệ: MARKETING_FACT",
    );

    const unknownSource = [...base];
    unknownSource[4] = "`CS-NOT-REAL`";
    expect(validateCapabilityRow(unknownSource, sourceIds, sourceKinds, masterTaskIds)).toContain(
      "nguồn không tồn tại: CS-NOT-REAL",
    );

    const unknownTask = [...base];
    unknownTask[5] = "`T101`";
    expect(validateCapabilityRow(unknownTask, sourceIds, sourceKinds, masterTaskIds)).toContain(
      "task không tồn tại: T101",
    );

    const blankAcceptance = [...base];
    blankAcceptance[6] = "TBD";
    expect(
      validateCapabilityRow(blankAcceptance, sourceIds, sourceKinds, masterTaskIds),
    ).toEqual(
      expect.arrayContaining(["acceptance quá ngắn", "acceptance còn placeholder"]),
    );

    const observedFromStoreOnly = [...capabilityRows[1]];
    observedFromStoreOnly[4] = "`CS-GPLAY`";
    expect(
      validateCapabilityRow(observedFromStoreOnly, sourceIds, sourceKinds, masterTaskIds),
    ).toContain("nguồn không hỗ trợ nhãn bằng chứng: OBSERVED");

    const outOfScopeWithoutVision = [...capabilityRows[0]];
    outOfScopeWithoutVision[4] = "`CS-GPLAY`, `CS-APPSTORE`";
    expect(
      validateCapabilityRow(outOfScopeWithoutVision, sourceIds, sourceKinds, masterTaskIds),
    ).toContain("nguồn không hỗ trợ nhãn bằng chứng: OUT_OF_SCOPE");

    expect(validateGapTrace("`CAP-999`", sourceIds, capabilityIds)).toContain(
      "trace không tồn tại: CAP-999",
    );

    expect(
      hasThresholdOwner("Đạt ngưỡng chưa có owner", "`T001`", masterTaskLines),
    ).toBe(false);
  });

  it("forbids unsupported sameness claims and stale placeholders", () => {
    expect(BENCHMARK).not.toMatch(/giống\s+hệt/iu);
    expect(BENCHMARK).not.toContain("31/07/2026");
    expect(BENCHMARK).not.toMatch(/\b(?:TODO|TBD)\b/iu);
  });
});
