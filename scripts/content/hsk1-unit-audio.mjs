import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk1UnitAudioReviewDocument,
  validateCompletedHsk1UnitAudioReviewDocument,
  validateHsk1UnitAudioEvidenceWorkflow,
} from "../../src/content/hsk1UnitAudioEvidenceWorkflow.mjs";
import {
  HSK1_UNIT_LOCAL_EVIDENCE_RELATIVE_PATH,
  loadHsk1UnitEvidenceIntakeSources,
} from "../../src/content/hsk1UnitEvidenceIntake.mjs";

const MAX_LOCAL_FILE_BYTES = 8 * 1024 * 1024;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const EVIDENCE_RELATIVE_PATH_PATTERN =
  /^audio\/evidence\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
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

const assertSafeId = (value, label) => {
  if (value.length > 128 || !SAFE_ID_PATTERN.test(value)) {
    throw new Error(`${label} must be a safe identifier`);
  }
};

const localRoot = (root) =>
  resolve(root, HSK1_UNIT_LOCAL_EVIDENCE_RELATIVE_PATH);

const resolveLocalFile = (root, relativePath, expectedKind) => {
  const allowed = expectedKind === "asset"
    ? /^audio\/assets\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.wav$/u
    : EVIDENCE_RELATIVE_PATH_PATTERN;
  if (!allowed.test(relativePath)) {
    throw new Error(`Unsafe ${expectedKind} relative path: ${relativePath}`);
  }
  const evidenceRoot = localRoot(root);
  const path = resolve(evidenceRoot, relativePath);
  if (!path.startsWith(`${evidenceRoot}${sep}`)) {
    throw new Error(`${expectedKind} path escapes local evidence root`);
  }
  const stat = lstatSync(path);
  if (
    !stat.isFile()
    || stat.isSymbolicLink()
    || stat.size === 0
    || stat.size > MAX_LOCAL_FILE_BYTES
  ) {
    throw new Error(`Unsafe or oversized local ${expectedKind} file: ${path}`);
  }
  return { path, bytes: new Uint8Array(readFileSync(path)) };
};

const writeExclusive = (path, value) => {
  writeFileSync(path, formatJson(value), { encoding: "utf8", flag: "wx" });
};

const readSafeLocalJson = (path, label) => {
  const stat = lstatSync(path);
  if (
    !stat.isFile()
    || stat.isSymbolicLink()
    || stat.size === 0
    || stat.size > MAX_LOCAL_FILE_BYTES
  ) {
    throw new Error(`Unsafe or oversized local ${label}: ${path}`);
  }
  const serialized = readFileSync(path, "utf8");
  return { serialized, value: JSON.parse(serialized) };
};

const assignmentPath = (root, recordId) => join(
  localRoot(root),
  "audio",
  "assignments",
  `${recordId}.json`,
);
const recordPath = (root, recordId) => join(
  localRoot(root),
  "records",
  `${recordId}.json`,
);

const commandValidate = async (root) => {
  console.log(formatJson({
    valid: true,
    summary: await validateHsk1UnitAudioEvidenceWorkflow(root),
  }));
};

const commandList = (root) => {
  const { packet } = loadHsk1UnitEvidenceIntakeSources(root).packetBundle;
  console.log(formatJson({
    packetId: packet.packetId,
    packetSha256: packet.packetSha256,
    targets: packet.audioRecordingManifest.map((target) => ({
      audioTargetId: target.audioTargetId,
      lessonId: target.lessonId,
      targetKind: target.targetKind,
      expectedFileName: target.expectedFileName,
      sourceTargetSha256: target.sourceTargetSha256,
    })),
  }));
};

const commandExport = async (root, args) => {
  const flags = parseFlags(args);
  const recordId = requiredFlag(flags, "record-id");
  assertSafeId(recordId, "record-id");
  const audioTargetId = requiredFlag(flags, "audio-target-id");
  const sources = loadHsk1UnitEvidenceIntakeSources(root);
  const target = sources.packetBundle.packet.audioRecordingManifest.find(
    (candidate) => candidate.audioTargetId === audioTargetId,
  );
  if (!target) throw new Error(`Unknown audio target: ${audioTargetId}`);
  const asset = resolveLocalFile(
    root,
    `audio/assets/${target.expectedFileName}`,
    "asset",
  );
  const speakerConsentRelativePath = requiredFlag(flags, "speaker-consent");
  const rightsRelativePath = requiredFlag(flags, "rights-evidence");
  const speakerConsent = resolveLocalFile(
    root,
    speakerConsentRelativePath,
    "evidence",
  );
  const rights = resolveLocalFile(root, rightsRelativePath, "evidence");
  const document = await buildHsk1UnitAudioReviewDocument({
    root,
    recordId,
    audioTargetId,
    assetBytes: asset.bytes,
    speakerId: requiredFlag(flags, "speaker-id"),
    languageTag: requiredFlag(flags, "language-tag"),
    recordedAt: requiredFlag(flags, "recorded-at"),
    speakerConsentRelativePath,
    speakerConsentBytes: speakerConsent.bytes,
    rightsRelativePath,
    rightsEvidenceBytes: rights.bytes,
    assignedBy: requiredFlag(flags, "assigned-by"),
    nativeReviewerId: requiredFlag(flags, "native-reviewer"),
    audioRightsReviewerId: requiredFlag(flags, "rights-reviewer"),
    assignedAt: requiredFlag(flags, "assigned-at"),
  });
  const path = assignmentPath(root, recordId);
  const serialized = formatJson(document);
  mkdirSync(dirname(path), { recursive: true });
  let idempotent = false;
  if (existsSync(path)) {
    const existing = readSafeLocalJson(path, "audio assignment");
    if (existing.serialized !== serialized) {
      throw new Error("A different audio assignment already exists");
    }
    idempotent = true;
  } else {
    writeExclusive(path, document);
  }
  console.log(formatJson({
    exported: true,
    idempotent,
    recordId,
    audioTargetId,
    assignmentSha256: document.assignmentSha256,
    path,
    note:
      "Both assigned reviewers must complete their own response checklist before import.",
  }));
};

const commandImport = async (root, args) => {
  const flags = parseFlags(args);
  const recordId = requiredFlag(flags, "record-id");
  assertSafeId(recordId, "record-id");
  const inputPath = assignmentPath(root, recordId);
  const document = readSafeLocalJson(
    inputPath,
    "audio assignment",
  ).value;
  if (document?.assignment?.recordId !== recordId) {
    throw new Error("Audio assignment identity does not match --record-id");
  }
  const asset = resolveLocalFile(
    root,
    document.assignment.asset.relativePath,
    "asset",
  );
  const speakerConsent = resolveLocalFile(
    root,
    document.assignment.speakerConsent.relativePath,
    "evidence",
  );
  const rights = resolveLocalFile(
    root,
    document.assignment.rights.relativePath,
    "evidence",
  );
  const result = await validateCompletedHsk1UnitAudioReviewDocument(document, {
    root,
    assetBytes: asset.bytes,
    speakerConsentBytes: speakerConsent.bytes,
    rightsEvidenceBytes: rights.bytes,
  });
  if (!result.valid || !result.record) {
    throw new Error(`Audio evidence import rejected:\n- ${result.errors.join("\n- ")}`);
  }
  const outputPath = recordPath(root, recordId);
  const serialized = formatJson(result.record);
  if (existsSync(outputPath)) {
    if (
      readSafeLocalJson(outputPath, "audio evidence record").serialized
      !== serialized
    ) {
      throw new Error("A different audio evidence record already exists");
    }
    console.log(formatJson({
      imported: true,
      idempotent: true,
      recordId,
      path: outputPath,
      recordSha256: result.record.recordSha256,
    }));
    return;
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeExclusive(outputPath, result.record);
  console.log(formatJson({
    imported: true,
    idempotent: false,
    recordId,
    path: outputPath,
    recordSha256: result.record.recordSha256,
    note: "Local evidence only; no package, runtime, visibility or mastery mutation.",
  }));
};

const main = async () => {
  const root = process.cwd();
  const [command = "validate", ...args] = process.argv.slice(2);
  if (command === "validate") return commandValidate(root);
  if (command === "list") return commandList(root);
  if (command === "export") return commandExport(root, args);
  if (command === "import") return commandImport(root, args);
  throw new Error(`Unsupported HSK1 unit audio command: ${command}`);
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
