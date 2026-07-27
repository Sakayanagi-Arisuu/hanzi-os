const CHARACTER_DATA_FORMAT = "hanzi-writer-v1";
const CHARACTER_LINGUISTIC_SOURCE_FORMAT = "json-object-v1";
const ROOT_FIELDS = new Set(["strokes", "medians", "radStrokes"]);

export const CHARACTER_DATA_IMPORT_POLICY = Object.freeze({
  schemaVersion: 1,
  format: CHARACTER_DATA_FORMAT,
  encoding: "utf-8",
  maxByteLength: 1024 * 1024,
  maxStrokeCount: 128,
  maxStrokePathCodeUnits: 64 * 1024,
  maxMedianPointsPerStroke: 4096,
  coordinateMinimum: -4096,
  coordinateMaximum: 4096,
});

const invalidCharacterData = (message) => {
  throw new Error(`Invalid Hanzi Writer character data: ${message}`);
};

const invalidLinguisticSource = (message) => {
  throw new Error(`Invalid character linguistic source record: ${message}`);
};

const hasOwn = (value, field) =>
  Object.prototype.hasOwnProperty.call(value, field);

const containsControlCharacter = (value) => {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) {
      return true;
    }
  }
  return false;
};

const isJsonWhitespace = (character) =>
  character === " "
  || character === "\t"
  || character === "\n"
  || character === "\r";

const skipWhitespace = (text, start) => {
  let index = start;
  while (index < text.length && isJsonWhitespace(text[index])) {
    index += 1;
  }
  return index;
};

const skipJsonString = (text, start) => {
  let index = start + 1;
  while (index < text.length) {
    if (text[index] === "\\") {
      index += 2;
    } else if (text[index] === "\"") {
      return index + 1;
    } else {
      index += 1;
    }
  }
  return text.length;
};

// JSON.parse discards duplicate object properties. Preserve the root property
// tokens separately so escaped spellings cannot make ambiguous source data
// appear valid after parsing.
const collectRootPropertyNames = (text) => {
  const names = [];
  let index = skipWhitespace(text, 0) + 1;

  while (index < text.length) {
    index = skipWhitespace(text, index);
    if (text[index] === "}") return names;

    const propertyStart = index;
    index = skipJsonString(text, index);
    names.push(JSON.parse(text.slice(propertyStart, index)));
    index = skipWhitespace(text, index) + 1;

    let nestedDepth = 0;
    while (index < text.length) {
      const character = text[index];
      if (character === "\"") {
        index = skipJsonString(text, index);
        continue;
      }
      if (character === "[" || character === "{") {
        nestedDepth += 1;
      } else if (character === "]" || character === "}") {
        if (nestedDepth === 0) break;
        nestedDepth -= 1;
      } else if (character === "," && nestedDepth === 0) {
        break;
      }
      index += 1;
    }

    index = skipWhitespace(text, index);
    if (text[index] === ",") {
      index += 1;
      continue;
    }
    return names;
  }

  return names;
};

const decodeJson = (bytes) => {
  if (
    bytes.byteLength >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf
  ) {
    invalidCharacterData("UTF-8 BOM is not allowed");
  }

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    invalidCharacterData("input must be valid UTF-8");
  }

  let document;
  try {
    document = JSON.parse(text);
  } catch {
    invalidCharacterData("input must contain exactly one valid JSON value");
  }

  return { document, text };
};

const validateStrokePath = (stroke, index) => {
  if (typeof stroke !== "string" || stroke.trim().length === 0) {
    invalidCharacterData(`strokes[${index}] must be a non-empty string`);
  }
  if (stroke.length > CHARACTER_DATA_IMPORT_POLICY.maxStrokePathCodeUnits) {
    invalidCharacterData(
      `strokes[${index}] exceeds ${CHARACTER_DATA_IMPORT_POLICY.maxStrokePathCodeUnits} code units`,
    );
  }
  if (containsControlCharacter(stroke)) {
    invalidCharacterData(`strokes[${index}] must not contain control characters`);
  }
};

const validateMedianPoint = (point, strokeIndex, pointIndex) => {
  if (!Array.isArray(point) || point.length !== 2) {
    invalidCharacterData(
      `medians[${strokeIndex}][${pointIndex}] must contain exactly two coordinates`,
    );
  }

  for (let coordinateIndex = 0; coordinateIndex < 2; coordinateIndex += 1) {
    const coordinate = point[coordinateIndex];
    if (!Number.isFinite(coordinate) || !Number.isInteger(coordinate)) {
      invalidCharacterData(
        `medians[${strokeIndex}][${pointIndex}][${coordinateIndex}] must be a finite integer`,
      );
    }
    if (
      coordinate < CHARACTER_DATA_IMPORT_POLICY.coordinateMinimum
      || coordinate > CHARACTER_DATA_IMPORT_POLICY.coordinateMaximum
    ) {
      invalidCharacterData(
        `medians[${strokeIndex}][${pointIndex}][${coordinateIndex}] must be between ${CHARACTER_DATA_IMPORT_POLICY.coordinateMinimum} and ${CHARACTER_DATA_IMPORT_POLICY.coordinateMaximum}`,
      );
    }
  }
};

/**
 * Inspect immutable Hanzi Writer character-data bytes without trusting a file
 * name or caller-supplied metadata.
 *
 * @param {Uint8Array} bytes
 * @returns {{
 *   ok: true;
 *   format: "hanzi-writer-v1";
 *   strokeCount: number;
 *   radicalStrokeIndices: number[];
 *   byteLength: number;
 * }}
 */
export const inspectHanziWriterCharacterData = (bytes) => {
  if (!(bytes instanceof Uint8Array)) {
    invalidCharacterData("input must be a Uint8Array");
  }
  if (bytes.byteLength > CHARACTER_DATA_IMPORT_POLICY.maxByteLength) {
    invalidCharacterData(
      `byte length ${bytes.byteLength} exceeds ${CHARACTER_DATA_IMPORT_POLICY.maxByteLength}`,
    );
  }

  const { document, text } = decodeJson(bytes);
  if (
    document === null
    || typeof document !== "object"
    || Array.isArray(document)
  ) {
    invalidCharacterData("root must be an object");
  }

  const sourcePropertyNames = collectRootPropertyNames(text);
  const seenPropertyNames = new Set();
  for (const field of sourcePropertyNames) {
    if (seenPropertyNames.has(field)) {
      invalidCharacterData(`root property ${JSON.stringify(field)} is duplicated`);
    }
    seenPropertyNames.add(field);
  }

  for (const field of Object.keys(document)) {
    if (!ROOT_FIELDS.has(field)) {
      invalidCharacterData(`unknown root property ${JSON.stringify(field)}`);
    }
  }
  for (const field of ["strokes", "medians"]) {
    if (!hasOwn(document, field)) {
      invalidCharacterData(`root property ${JSON.stringify(field)} is required`);
    }
  }

  if (!Array.isArray(document.strokes) || document.strokes.length === 0) {
    invalidCharacterData("strokes must be a non-empty array");
  }
  if (document.strokes.length > CHARACTER_DATA_IMPORT_POLICY.maxStrokeCount) {
    invalidCharacterData(
      `stroke count ${document.strokes.length} exceeds ${CHARACTER_DATA_IMPORT_POLICY.maxStrokeCount}`,
    );
  }
  document.strokes.forEach(validateStrokePath);

  if (!Array.isArray(document.medians)) {
    invalidCharacterData("medians must be an array");
  }
  if (document.medians.length !== document.strokes.length) {
    invalidCharacterData("medians length must equal strokes length");
  }
  document.medians.forEach((median, strokeIndex) => {
    if (!Array.isArray(median) || median.length === 0) {
      invalidCharacterData(`medians[${strokeIndex}] must be a non-empty array`);
    }
    if (
      median.length
      > CHARACTER_DATA_IMPORT_POLICY.maxMedianPointsPerStroke
    ) {
      invalidCharacterData(
        `medians[${strokeIndex}] exceeds ${CHARACTER_DATA_IMPORT_POLICY.maxMedianPointsPerStroke} points`,
      );
    }
    median.forEach((point, pointIndex) => {
      validateMedianPoint(point, strokeIndex, pointIndex);
    });
  });

  const radicalStrokeIndices = hasOwn(document, "radStrokes")
    ? document.radStrokes
    : [];
  if (!Array.isArray(radicalStrokeIndices)) {
    invalidCharacterData("radStrokes must be an array when supplied");
  }
  const seenRadicalStrokeIndices = new Set();
  radicalStrokeIndices.forEach((strokeIndex, index) => {
    if (!Number.isInteger(strokeIndex)) {
      invalidCharacterData(`radStrokes[${index}] must be an integer`);
    }
    if (strokeIndex < 0 || strokeIndex >= document.strokes.length) {
      invalidCharacterData(`radStrokes[${index}] is outside the stroke range`);
    }
    if (seenRadicalStrokeIndices.has(strokeIndex)) {
      invalidCharacterData(`radStrokes contains duplicate index ${strokeIndex}`);
    }
    seenRadicalStrokeIndices.add(strokeIndex);
  });

  return {
    ok: true,
    format: CHARACTER_DATA_FORMAT,
    strokeCount: document.strokes.length,
    radicalStrokeIndices: [...radicalStrokeIndices],
    byteLength: bytes.byteLength,
  };
};

/**
 * Inspect a package-local linguistic source snapshot without interpreting its
 * editorial claims. The native review still owns semantics; this boundary
 * guarantees that a `.json` record is actually a bounded, unambiguous UTF-8
 * JSON object rather than arbitrary bytes.
 *
 * @param {Uint8Array} bytes
 * @returns {{
 *   ok: true;
 *   format: "json-object-v1";
 *   character: string;
 *   byteLength: number;
 * }}
 */
export const inspectCharacterLinguisticSourceRecord = (bytes) => {
  if (!(bytes instanceof Uint8Array)) {
    invalidLinguisticSource("input must be a Uint8Array");
  }
  if (bytes.byteLength === 0) {
    invalidLinguisticSource("input must not be empty");
  }
  if (bytes.byteLength > CHARACTER_DATA_IMPORT_POLICY.maxByteLength) {
    invalidLinguisticSource(
      `byte length ${bytes.byteLength} exceeds ${CHARACTER_DATA_IMPORT_POLICY.maxByteLength}`,
    );
  }
  if (
    bytes.byteLength >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf
  ) {
    invalidLinguisticSource("UTF-8 BOM is not allowed");
  }

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    invalidLinguisticSource("input must be valid UTF-8");
  }
  let document;
  try {
    document = JSON.parse(text);
  } catch {
    invalidLinguisticSource("input must contain exactly one valid JSON value");
  }
  if (
    document === null
    || typeof document !== "object"
    || Array.isArray(document)
  ) {
    invalidLinguisticSource("root must be an object");
  }
  if (Object.keys(document).length === 0) {
    invalidLinguisticSource("root object must not be empty");
  }
  if (
    typeof document.character !== "string"
    || [...document.character].length !== 1
  ) {
    invalidLinguisticSource(
      "root.character must contain exactly one Unicode character",
    );
  }

  const sourcePropertyNames = collectRootPropertyNames(text);
  const seenPropertyNames = new Set();
  for (const field of sourcePropertyNames) {
    if (seenPropertyNames.has(field)) {
      invalidLinguisticSource(
        `root property ${JSON.stringify(field)} is duplicated`,
      );
    }
    seenPropertyNames.add(field);
  }

  return {
    ok: true,
    format: CHARACTER_LINGUISTIC_SOURCE_FORMAT,
    character: document.character,
    byteLength: bytes.byteLength,
  };
};
