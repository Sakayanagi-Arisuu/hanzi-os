import { execFile, spawn } from "node:child_process";
import {
  lstat,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  collectDistArtifacts,
  computeBuildSha256,
  hashRegularFile,
  serializeCanonicalJson,
  validateSafeRelativePath,
} from "../generate-release-evidence.mjs";

const execFileAsync = promisify(execFile);

export const LOCAL_CANDIDATE_CONTRACT_PATH =
  "config/hsk0-4-local-candidate.json";
export const LOCAL_CANDIDATE_SCHEMA_VERSION = 1;
export const LOCAL_CANDIDATE_RECEIPT_SCHEMA_VERSION = 1;

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_REVISION_PATTERN = /^[0-9a-f]{40}$/u;
const EXPECTED_KIND = "local-graduation-release-candidate";
const EXPECTED_GATE_ARGUMENTS = new Map([
  ["technical-baseline", ["run", "check"]],
  ["browser-acceptance", ["run", "test:e2e", "--", "--reporter=json"]],
  ["local-lighthouse", ["run", "test:lighthouse"]],
  ["production-dependency-audit", ["audit", "--omit=dev"]],
]);
const REQUIRED_ACCEPTANCE_IDS = [
  "hsk0-hsk1-real-ui-demo",
  "mobile-layout-and-command-sheet",
  "keyboard-destructive-dialog",
  "keyboard-single-select",
  "reduced-motion",
  "offline-shell",
  "owner-safe-reset",
  "backup-export-import-reload",
];
const REQUIRED_ALLOWED_POST_RUN_PATHS = [
  "docs/HSK4_GRADUATION_PLAN.md",
  "docs/IMPLEMENTATION_CHECKPOINT.md",
  "local-release-candidate/evidence-index.json",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const equalStringArrays = (left, right) =>
  Array.isArray(left)
  && left.length === right.length
  && left.every((item, index) => item === right[index]);

const toPortablePath = (path) => path.split(sep).join("/");

const normalizeTestFile = (file) => {
  const portable = toPortablePath(file);
  const marker = "/e2e/";
  const markerIndex = portable.lastIndexOf(marker);
  if (markerIndex >= 0) return portable.slice(markerIndex + 1);
  const normalized = portable.replace(/^\.\//u, "");
  return normalized.includes("/") ? normalized : `e2e/${normalized}`;
};

const assertRegularFile = async (path, label) => {
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be a regular file, not a symlink`);
  }
};

const readJson = async (path, label) => {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error(`${label} must contain valid JSON`);
  }
  return parsed;
};

const resolveRepositoryPath = (root, relativePath) => {
  validateSafeRelativePath(relativePath);
  const absoluteRoot = resolve(root);
  const candidate = resolve(absoluteRoot, ...relativePath.split("/"));
  if (!candidate.startsWith(`${absoluteRoot}${sep}`)) {
    throw new Error(`Path escapes repository root: ${relativePath}`);
  }
  return candidate;
};

const hasExactKeys = (value, expectedKeys) => {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  return equalStringArrays(actual, [...expectedKeys].sort());
};

export const validateLocalCandidateContract = (contract) => {
  const errors = [];
  if (!hasExactKeys(contract, [
    "schemaVersion",
    "candidateId",
    "kind",
    "claimBoundary",
    "sourcePolicy",
    "artifacts",
    "gates",
    "acceptanceMatrix",
  ])) {
    errors.push("Candidate contract fields are missing or unexpected");
  }
  if (contract?.schemaVersion !== LOCAL_CANDIDATE_SCHEMA_VERSION) {
    errors.push("Candidate contract schemaVersion is unsupported");
  }
  if (typeof contract?.candidateId !== "string" || contract.candidateId.length < 8) {
    errors.push("Candidate ID is missing or invalid");
  }
  if (contract?.kind !== EXPECTED_KIND) {
    errors.push("Candidate kind must remain local-graduation-release-candidate");
  }

  const boundary = contract?.claimBoundary;
  if (!hasExactKeys(boundary, [
    "environment",
    "productionReady",
    "hostedEvidence",
    "humanReviewEvidence",
    "assessmentCalibrationEvidence",
    "sitesVerified",
  ])) {
    errors.push("Candidate claim boundary fields are missing or unexpected");
  } else if (
    boundary.environment !== "local"
    || boundary.productionReady !== false
    || boundary.hostedEvidence !== false
    || boundary.humanReviewEvidence !== false
    || boundary.assessmentCalibrationEvidence !== false
    || boundary.sitesVerified !== false
  ) {
    errors.push("Candidate may not claim production, hosted, review, calibration or Sites evidence");
  }

  const sourcePolicy = contract?.sourcePolicy;
  if (!hasExactKeys(sourcePolicy, [
    "runFromCleanGitHead",
    "receiptRelativePath",
    "allowedPostRunPaths",
  ])) {
    errors.push("Candidate source policy fields are missing or unexpected");
  } else {
    if (sourcePolicy.runFromCleanGitHead !== true) {
      errors.push("Candidate must run from a clean Git HEAD");
    }
    try {
      validateSafeRelativePath(sourcePolicy.receiptRelativePath);
    } catch {
      errors.push("Candidate receipt path is unsafe");
    }
    if (!equalStringArrays(
      [...(sourcePolicy.allowedPostRunPaths ?? [])].sort(),
      [...REQUIRED_ALLOWED_POST_RUN_PATHS].sort(),
    )) {
      errors.push("Candidate post-run path allow-list is invalid");
    }
  }

  if (!Array.isArray(contract?.artifacts) || contract.artifacts.length === 0) {
    errors.push("Candidate artifacts must be a non-empty array");
  } else {
    const ids = new Set();
    const paths = new Set();
    for (const artifact of contract.artifacts) {
      if (!hasExactKeys(artifact, ["id", "relativePath", "role"])) {
        errors.push("Candidate artifact fields are missing or unexpected");
        continue;
      }
      if (
        typeof artifact.id !== "string"
        || artifact.id.length === 0
        || ids.has(artifact.id)
      ) {
        errors.push(`Candidate artifact ID is invalid or duplicated: ${String(artifact.id)}`);
      }
      ids.add(artifact.id);
      try {
        validateSafeRelativePath(artifact.relativePath);
      } catch {
        errors.push(`Candidate artifact path is unsafe: ${String(artifact.relativePath)}`);
      }
      if (paths.has(artifact.relativePath)) {
        errors.push(`Candidate artifact path is duplicated: ${artifact.relativePath}`);
      }
      paths.add(artifact.relativePath);
      if (typeof artifact.role !== "string" || artifact.role.length === 0) {
        errors.push(`Candidate artifact role is missing: ${String(artifact.id)}`);
      }
    }
  }

  if (!Array.isArray(contract?.gates)) {
    errors.push("Candidate gates must be an array");
  } else {
    const gateIds = new Set();
    for (const gate of contract.gates) {
      if (!hasExactKeys(gate, ["id", "npmArguments"])) {
        errors.push("Candidate gate fields are missing or unexpected");
        continue;
      }
      if (gateIds.has(gate.id)) {
        errors.push(`Candidate gate ID is duplicated: ${String(gate.id)}`);
      }
      gateIds.add(gate.id);
      const expectedArguments = EXPECTED_GATE_ARGUMENTS.get(gate.id);
      if (!expectedArguments || !equalStringArrays(gate.npmArguments, expectedArguments)) {
        errors.push(`Candidate gate is not allow-listed: ${String(gate.id)}`);
      }
    }
    for (const expectedId of EXPECTED_GATE_ARGUMENTS.keys()) {
      if (!gateIds.has(expectedId)) {
        errors.push(`Candidate gate is missing: ${expectedId}`);
      }
    }
  }

  if (!Array.isArray(contract?.acceptanceMatrix)) {
    errors.push("Candidate acceptance matrix must be an array");
  } else {
    const ids = new Set();
    for (const item of contract.acceptanceMatrix) {
      if (!hasExactKeys(item, ["id", "capability", "testFile", "testTitle"])) {
        errors.push("Candidate acceptance fields are missing or unexpected");
        continue;
      }
      if (ids.has(item.id)) {
        errors.push(`Candidate acceptance ID is duplicated: ${String(item.id)}`);
      }
      ids.add(item.id);
      try {
        validateSafeRelativePath(item.testFile);
      } catch {
        errors.push(`Candidate acceptance test path is unsafe: ${String(item.testFile)}`);
      }
      if (
        typeof item.capability !== "string"
        || item.capability.length === 0
        || typeof item.testTitle !== "string"
        || item.testTitle.length === 0
      ) {
        errors.push(`Candidate acceptance definition is invalid: ${String(item.id)}`);
      }
    }
    if (!equalStringArrays([...ids].sort(), [...REQUIRED_ACCEPTANCE_IDS].sort())) {
      errors.push("Candidate acceptance matrix does not cover the required G5 capabilities");
    }
  }

  return { valid: errors.length === 0, errors };
};

export const assertValidLocalCandidateContract = (contract) => {
  const result = validateLocalCandidateContract(contract);
  if (!result.valid) {
    throw new Error(`Invalid local candidate contract:\n- ${result.errors.join("\n- ")}`);
  }
  return result;
};

export const loadLocalCandidateContract = async (root = process.cwd()) => {
  const path = resolveRepositoryPath(root, LOCAL_CANDIDATE_CONTRACT_PATH);
  await assertRegularFile(path, "local candidate contract");
  const contract = await readJson(path, "local candidate contract");
  assertValidLocalCandidateContract(contract);
  return { contract, path };
};

const collectNestedPlaywrightSpecs = (suite, output) => {
  for (const spec of Array.isArray(suite?.specs) ? suite.specs : []) {
    const tests = Array.isArray(spec.tests) ? spec.tests : [];
    const passed = tests.some((test) => {
      const results = Array.isArray(test.results) ? test.results : [];
      return results.at(-1)?.status === "passed";
    });
    output.push({
      file: normalizeTestFile(spec.file ?? suite.file ?? ""),
      title: spec.title,
      passed,
    });
  }
  for (const child of Array.isArray(suite?.suites) ? suite.suites : []) {
    collectNestedPlaywrightSpecs(child, output);
  }
};

export const collectPlaywrightCases = (report) => {
  if (!isRecord(report) || !Array.isArray(report.suites)) {
    throw new Error("Playwright JSON report is missing suites");
  }
  const cases = [];
  for (const suite of report.suites) collectNestedPlaywrightSpecs(suite, cases);
  return cases;
};

export const bindAcceptanceResults = (acceptanceMatrix, playwrightReport) => {
  const cases = collectPlaywrightCases(playwrightReport);
  return acceptanceMatrix.map((item) => {
    const matching = cases.filter((testCase) =>
      testCase.file === item.testFile && testCase.title === item.testTitle
    );
    if (matching.length !== 1 || !matching[0].passed) {
      throw new Error(
        `Required acceptance case did not pass exactly once: ${item.testFile} :: ${item.testTitle}`,
      );
    }
    return { ...item, status: "passed" };
  });
};

export const validateAcceptanceSourceBindings = async (
  root,
  acceptanceMatrix,
) => {
  const sourceByPath = new Map();
  for (const item of acceptanceMatrix) {
    if (!sourceByPath.has(item.testFile)) {
      const path = resolveRepositoryPath(root, item.testFile);
      await assertRegularFile(path, `acceptance test ${item.testFile}`);
      sourceByPath.set(item.testFile, await readFile(path, "utf8"));
    }
    const source = sourceByPath.get(item.testFile);
    if (!source.includes(JSON.stringify(item.testTitle))) {
      throw new Error(
        `Acceptance test title is missing or stale: ${item.testFile} :: ${item.testTitle}`,
      );
    }
  }
};

export const summarizeProductionBlockers = (readiness) => {
  if (!isRecord(readiness) || !isRecord(readiness.gates)) {
    throw new Error("Production readiness manifest is invalid");
  }
  const gates = Object.values(readiness.gates);
  const blockers = gates.flatMap((gate) =>
    isRecord(gate) && Array.isArray(gate.blockers) ? gate.blockers : []
  );
  if (
    gates.length === 0
    || gates.some((gate) => !isRecord(gate) || gate.status !== "pending")
    || blockers.length === 0
  ) {
    throw new Error("Local candidate requires production readiness to remain fail-closed");
  }
  return {
    status: "blocked",
    pendingGateCount: gates.length,
    blockerCount: blockers.length,
    productionEvidenceClaimed: false,
  };
};

const buildCheckedArtifactIndex = async (root, contract) => {
  const artifacts = [];
  for (const definition of contract.artifacts) {
    const path = resolveRepositoryPath(root, definition.relativePath);
    await assertRegularFile(path, `candidate artifact ${definition.id}`);
    artifacts.push({
      ...definition,
      ...(await hashRegularFile(path)),
    });
  }
  return artifacts;
};

const readGitIdentity = async (root) => {
  const options = {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  };
  const [revision, tree, status] = await Promise.all([
    execFileAsync("git", ["rev-parse", "--verify", "HEAD^{commit}"], options),
    execFileAsync("git", ["rev-parse", "--verify", "HEAD^{tree}"], options),
    execFileAsync(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      options,
    ),
  ]);
  return {
    revision: revision.stdout.trim().toLowerCase(),
    tree: tree.stdout.trim().toLowerCase(),
    status: status.stdout,
  };
};

const assertCleanGitIdentity = (identity) => {
  if (
    !GIT_REVISION_PATTERN.test(identity.revision)
    || !GIT_REVISION_PATTERN.test(identity.tree)
  ) {
    throw new Error("Local candidate requires a valid Git revision and tree");
  }
  if (identity.status.trim().length > 0) {
    throw new Error("Local candidate must run from a clean Git worktree");
  }
};

const resolveLocalNpmCli = () =>
  resolve(
    dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );

const runNpmGate = ({ root, npmArguments, environment = {} }) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [resolveLocalNpmCli(), ...npmArguments],
      {
        cwd: root,
        env: { ...process.env, ...environment },
        stdio: "inherit",
        windowsHide: true,
      },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(
        `Gate npm ${npmArguments.join(" ")} failed (${signal ?? `exit ${String(code)}`})`,
      ));
    });
  });

const runCandidateGates = async ({ root, contract, executeGate = runNpmGate }) => {
  const playwrightReportPath = resolve(
    root,
    "test-results",
    "local-candidate-playwright.json",
  );
  const gates = [];
  for (const gate of contract.gates) {
    const environment = gate.id === "browser-acceptance"
      ? { PLAYWRIGHT_JSON_OUTPUT_FILE: playwrightReportPath }
      : {};
    await executeGate({ root, npmArguments: gate.npmArguments, environment });
    gates.push({
      id: gate.id,
      command: `npm ${gate.npmArguments.join(" ")}`,
      status: "passed",
    });
  }
  const playwrightReport = await readJson(
    playwrightReportPath,
    "Playwright acceptance report",
  );
  return {
    gates,
    acceptanceMatrix: bindAcceptanceResults(
      contract.acceptanceMatrix,
      playwrightReport,
    ),
  };
};

const buildDistIdentity = async (root) => {
  const artifacts = await collectDistArtifacts(resolve(root, "dist"));
  const bytes = artifacts.reduce((total, artifact) => total + artifact.bytes, 0);
  return {
    root: "dist",
    artifactCount: artifacts.length,
    bytes,
    sha256: computeBuildSha256({
      artifactCount: artifacts.length,
      artifacts,
      bytes,
      excludedPath: "release-evidence/",
      root: "dist",
    }),
  };
};

export const buildLocalCandidateReceipt = ({
  contract,
  source,
  contractIdentity,
  artifacts,
  gates,
  acceptanceMatrix,
  build,
  productionReadiness,
}) => ({
  schemaVersion: LOCAL_CANDIDATE_RECEIPT_SCHEMA_VERSION,
  candidateId: contract.candidateId,
  kind: contract.kind,
  claimBoundary: contract.claimBoundary,
  source: {
    revision: source.revision,
    tree: source.tree,
    cleanAtGateStart: true,
    cleanAtGateFinish: true,
  },
  contract: {
    relativePath: LOCAL_CANDIDATE_CONTRACT_PATH,
    ...contractIdentity,
  },
  artifacts,
  gates,
  acceptanceMatrix,
  build,
  productionReadiness,
});

export const validateLocalCandidateInputs = async (root = process.cwd()) => {
  const { contract, path } = await loadLocalCandidateContract(root);
  await validateAcceptanceSourceBindings(root, contract.acceptanceMatrix);
  const artifacts = await buildCheckedArtifactIndex(root, contract);
  const readinessArtifact = contract.artifacts.find(
    (artifact) => artifact.id === "production-readiness",
  );
  if (!readinessArtifact) {
    throw new Error("Candidate production-readiness artifact is missing");
  }
  const productionReadiness = summarizeProductionBlockers(
    await readJson(
      resolveRepositoryPath(root, readinessArtifact.relativePath),
      "production readiness manifest",
    ),
  );
  return {
    contract,
    contractIdentity: await hashRegularFile(path),
    artifacts,
    productionReadiness,
  };
};

export const generateLocalCandidate = async ({
  root = process.cwd(),
  executeGate = runNpmGate,
} = {}) => {
  const inputs = await validateLocalCandidateInputs(root);
  const sourceAtStart = await readGitIdentity(root);
  assertCleanGitIdentity(sourceAtStart);
  const gateResults = await runCandidateGates({
    root,
    contract: inputs.contract,
    executeGate,
  });
  const sourceAtFinish = await readGitIdentity(root);
  assertCleanGitIdentity(sourceAtFinish);
  if (
    sourceAtFinish.revision !== sourceAtStart.revision
    || sourceAtFinish.tree !== sourceAtStart.tree
  ) {
    throw new Error("Git source changed while local candidate gates were running");
  }
  const receipt = buildLocalCandidateReceipt({
    ...inputs,
    ...gateResults,
    source: sourceAtStart,
    build: await buildDistIdentity(root),
  });
  const outputPath = resolveRepositoryPath(
    root,
    inputs.contract.sourcePolicy.receiptRelativePath,
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serializeCanonicalJson(receipt), "utf8");
  return { receipt, outputPath };
};

const assertReceiptHash = (actual, expected, label) => {
  if (
    !isRecord(expected)
    || !Number.isSafeInteger(expected.bytes)
    || expected.bytes < 0
    || !SHA256_PATTERN.test(expected.sha256)
    || actual.bytes !== expected.bytes
    || actual.sha256 !== expected.sha256
  ) {
    throw new Error(`Local candidate artifact is missing or stale: ${label}`);
  }
};

const readChangedPathsSinceSource = async (root, sourceRevision) => {
  const options = { cwd: root, encoding: "utf8", windowsHide: true };
  try {
    await execFileAsync(
      "git",
      ["merge-base", "--is-ancestor", sourceRevision, "HEAD"],
      options,
    );
  } catch {
    throw new Error("Candidate source revision is not an ancestor of current HEAD");
  }
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--name-only", `${sourceRevision}..HEAD`],
    options,
  );
  return stdout
    .split(/\r?\n/u)
    .map((path) => path.trim())
    .filter(Boolean)
    .map(toPortablePath);
};

export const assertAllowedPostRunChanges = (changedPaths, allowedPaths) => {
  const allowed = new Set(allowedPaths);
  const unexpected = changedPaths.filter((path) => !allowed.has(path));
  if (unexpected.length > 0) {
    throw new Error(
      `Candidate source revision is stale; changed paths: ${unexpected.join(", ")}`,
    );
  }
};

export const verifyLocalCandidate = async (root = process.cwd()) => {
  const inputs = await validateLocalCandidateInputs(root);
  const receiptPath = resolveRepositoryPath(
    root,
    inputs.contract.sourcePolicy.receiptRelativePath,
  );
  await assertRegularFile(receiptPath, "local candidate evidence receipt");
  const receipt = await readJson(receiptPath, "local candidate evidence receipt");
  if (
    receipt.schemaVersion !== LOCAL_CANDIDATE_RECEIPT_SCHEMA_VERSION
    || receipt.candidateId !== inputs.contract.candidateId
    || receipt.kind !== EXPECTED_KIND
    || JSON.stringify(receipt.claimBoundary) !== JSON.stringify(inputs.contract.claimBoundary)
  ) {
    throw new Error("Local candidate evidence receipt identity is invalid");
  }
  if (
    !isRecord(receipt.source)
    || !GIT_REVISION_PATTERN.test(receipt.source.revision)
    || !GIT_REVISION_PATTERN.test(receipt.source.tree)
    || receipt.source.cleanAtGateStart !== true
    || receipt.source.cleanAtGateFinish !== true
  ) {
    throw new Error("Local candidate source identity is invalid");
  }
  const currentIdentity = await readGitIdentity(root);
  assertCleanGitIdentity(currentIdentity);
  const changedPaths = await readChangedPathsSinceSource(
    root,
    receipt.source.revision,
  );
  assertAllowedPostRunChanges(
    changedPaths,
    inputs.contract.sourcePolicy.allowedPostRunPaths,
  );

  assertReceiptHash(inputs.contractIdentity, receipt.contract, "contract");
  if (!Array.isArray(receipt.artifacts) || receipt.artifacts.length !== inputs.artifacts.length) {
    throw new Error("Local candidate artifact index is incomplete");
  }
  for (const expected of inputs.artifacts) {
    const recorded = receipt.artifacts.find((artifact) => artifact.id === expected.id);
    if (
      !recorded
      || recorded.relativePath !== expected.relativePath
      || recorded.role !== expected.role
    ) {
      throw new Error(`Local candidate artifact binding is invalid: ${expected.id}`);
    }
    assertReceiptHash(expected, recorded, expected.relativePath);
  }

  if (
    !Array.isArray(receipt.gates)
    || receipt.gates.length !== inputs.contract.gates.length
    || receipt.gates.some((gate) => gate.status !== "passed")
  ) {
    throw new Error("Local candidate gate results are incomplete");
  }
  if (
    !Array.isArray(receipt.acceptanceMatrix)
    || receipt.acceptanceMatrix.length !== inputs.contract.acceptanceMatrix.length
    || receipt.acceptanceMatrix.some((item) => item.status !== "passed")
  ) {
    throw new Error("Local candidate acceptance results are incomplete");
  }
  const expectedAcceptance = inputs.contract.acceptanceMatrix.map((item) => ({
    ...item,
    status: "passed",
  }));
  if (JSON.stringify(receipt.acceptanceMatrix) !== JSON.stringify(expectedAcceptance)) {
    throw new Error("Local candidate acceptance bindings are stale");
  }
  if (JSON.stringify(receipt.productionReadiness) !== JSON.stringify(inputs.productionReadiness)) {
    throw new Error("Local candidate production blocker summary is stale");
  }

  const currentBuild = await buildDistIdentity(root);
  if (JSON.stringify(currentBuild) !== JSON.stringify(receipt.build)) {
    throw new Error("Local candidate build is missing or stale");
  }
  return {
    valid: true,
    candidateId: receipt.candidateId,
    sourceRevision: receipt.source.revision,
    gateCount: receipt.gates.length,
    acceptanceCount: receipt.acceptanceMatrix.length,
    artifactCount: receipt.artifacts.length,
    productionReadiness: receipt.productionReadiness,
  };
};

const runCli = async () => {
  const mode = process.argv[2] ?? "validate";
  if (mode === "validate") {
    const result = await validateLocalCandidateInputs();
    console.log(JSON.stringify({
      valid: true,
      candidateId: result.contract.candidateId,
      artifactCount: result.artifacts.length,
      gateCount: result.contract.gates.length,
      acceptanceCount: result.contract.acceptanceMatrix.length,
      productionReadiness: result.productionReadiness,
    }, null, 2));
    return;
  }
  if (mode === "run") {
    const { receipt, outputPath } = await generateLocalCandidate();
    console.log(JSON.stringify({
      valid: true,
      candidateId: receipt.candidateId,
      sourceRevision: receipt.source.revision,
      output: toPortablePath(relative(process.cwd(), outputPath)),
      gateCount: receipt.gates.length,
      acceptanceCount: receipt.acceptanceMatrix.length,
      productionReady: false,
    }, null, 2));
    return;
  }
  if (mode === "verify") {
    console.log(JSON.stringify(await verifyLocalCandidate(), null, 2));
    return;
  }
  throw new Error(`Unknown local candidate mode: ${mode}`);
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
