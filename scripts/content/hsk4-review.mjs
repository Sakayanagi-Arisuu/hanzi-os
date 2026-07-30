import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSafeHsk4ReviewId,
  buildHsk4ReviewAssignmentDocument,
  validateCompletedHsk4ReviewDocument,
  validateHsk4ReviewWorkflow,
} from "../../src/content/hsk4ReviewWorkflow.mjs";
import {
  assertValidHsk4ReviewManifestBundle,
  loadHsk4ReviewManifestBundle,
} from "../../src/content/hsk4ReviewManifest.mjs";

const formatJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

const parseFlags = (args) => {
  const flags = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flag?.startsWith("--")) throw new Error(`Unexpected argument: ${flag}`);
    const name = flag.slice(2);
    if (flags.has(name)) throw new Error(`Duplicate flag: --${name}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`--${name} requires a value`);
    }
    flags.set(name, value);
    index += 1;
  }
  return flags;
};

const requiredFlag = (flags, name) => {
  const value = flags.get(name);
  if (!value) throw new Error(`--${name} is required`);
  return value;
};

const localPaths = (root, assignmentId) => {
  assertSafeHsk4ReviewId(assignmentId, "assignment-id");
  const localRoot = join(root, "content", "review", "local", "hsk4");
  return {
    assignmentsDirectory: join(localRoot, "assignments"),
    receiptsDirectory: join(localRoot, "receipts"),
    assignmentPath: join(localRoot, "assignments", `${assignmentId}.json`),
    receiptPath: join(localRoot, "receipts", `${assignmentId}.receipt.json`),
  };
};

const writeExclusive = (path, value) => {
  writeFileSync(path, formatJson(value), { encoding: "utf8", flag: "wx" });
};

const commandValidate = async (root) => {
  console.log(JSON.stringify({
    valid: true,
    summary: await validateHsk4ReviewWorkflow(root),
  }, null, 2));
};

const commandList = (root) => {
  const bundle = loadHsk4ReviewManifestBundle(root);
  assertValidHsk4ReviewManifestBundle(bundle);
  console.log(formatJson({
    manifestId: bundle.manifest.manifestId,
    batches: bundle.manifest.reviewBatches.map((batch) => ({
      batchId: batch.batchId,
      sourceKind: batch.sourceKind,
      requiredRoles: batch.requiredRoles,
      targetCounts: batch.targetCounts,
    })),
  }));
};

const commandExport = async (root, args) => {
  const flags = parseFlags(args);
  const assignmentId = requiredFlag(flags, "assignment-id");
  const paths = localPaths(root, assignmentId);
  const document = await buildHsk4ReviewAssignmentDocument({
    root,
    assignmentId,
    batchId: requiredFlag(flags, "batch-id"),
    role: requiredFlag(flags, "role"),
    assignedBy: requiredFlag(flags, "assigned-by"),
    assignee: requiredFlag(flags, "assignee"),
    assignedAt: requiredFlag(flags, "assigned-at"),
  });
  mkdirSync(paths.assignmentsDirectory, { recursive: true });
  writeExclusive(paths.assignmentPath, document);
  console.log(formatJson({
    exported: true,
    assignmentId,
    path: paths.assignmentPath,
    assignmentSha256: document.assignmentSha256,
    note:
      "Complete only the response object, then run content:hsk4:review:import.",
  }));
};

const commandImport = async (root, args) => {
  const flags = parseFlags(args);
  const assignmentId = requiredFlag(flags, "assignment-id");
  const paths = localPaths(root, assignmentId);
  const document = JSON.parse(readFileSync(paths.assignmentPath, "utf8"));
  if (document?.assignment?.assignmentId !== assignmentId) {
    throw new Error("Assignment file identity does not match --assignment-id");
  }
  const result = await validateCompletedHsk4ReviewDocument(document, { root });
  if (!result.valid) {
    throw new Error(`Review import rejected:\n- ${result.errors.join("\n- ")}`);
  }
  mkdirSync(paths.receiptsDirectory, { recursive: true });
  const serialized = formatJson(result.receipt);
  if (existsSync(paths.receiptPath)) {
    if (readFileSync(paths.receiptPath, "utf8") !== serialized) {
      throw new Error("A different receipt already exists for this assignment");
    }
    console.log(formatJson({
      imported: true,
      idempotent: true,
      path: paths.receiptPath,
      receiptSha256: result.receipt.receiptSha256,
    }));
    return;
  }
  writeExclusive(paths.receiptPath, result.receipt);
  console.log(formatJson({
    imported: true,
    idempotent: false,
    path: paths.receiptPath,
    receiptSha256: result.receipt.receiptSha256,
    note:
      "Local receipt only; no content, manifest, runtime, calibration or mastery mutation occurred.",
  }));
};

const main = async () => {
  const root = process.cwd();
  const [command = "validate", ...args] = process.argv.slice(2);
  if (command === "validate") return commandValidate(root);
  if (command === "list") return commandList(root);
  if (command === "export") return commandExport(root, args);
  if (command === "import") return commandImport(root, args);
  throw new Error(`Unsupported HSK4 review command: ${command}`);
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
