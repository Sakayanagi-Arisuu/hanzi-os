import { describe, expect, it } from "vitest";
import {
  CHARACTER_DATA_IMPORT_POLICY,
  inspectCharacterLinguisticSourceRecord,
  inspectHanziWriterCharacterData,
} from "./characterDataInspection.mjs";

const encodeJson = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));

const makeCharacterData = (
  overrides: Record<string, unknown> = {},
) => ({
  strokes: ["M 0 0 L 10 10", "M 10 0 L 0 10"],
  medians: [
    [[0, 0], [10, 10]],
    [[10, 0], [0, 10]],
  ],
  radStrokes: [1],
  ...overrides,
});

describe("inspectHanziWriterCharacterData", () => {
  it("returns metadata derived from valid UTF-8 Hanzi Writer bytes", () => {
    const bytes = encodeJson(makeCharacterData({
      strokes: ["M 0 0 L 10 10 漢", "M 10 0 L 0 10"],
    }));

    expect(inspectHanziWriterCharacterData(bytes)).toEqual({
      ok: true,
      format: "hanzi-writer-v1",
      strokeCount: 2,
      radicalStrokeIndices: [1],
      byteLength: bytes.byteLength,
    });
  });

  it("defaults omitted radical stroke data to an empty list", () => {
    const { radStrokes: _omittedRadStrokes, ...document } = makeCharacterData();

    expect(
      inspectHanziWriterCharacterData(encodeJson(document)).radicalStrokeIndices,
    ).toEqual([]);
  });

  it("accepts inclusive coordinate and collection limits", () => {
    const lastStrokeIndex = CHARACTER_DATA_IMPORT_POLICY.maxStrokeCount - 1;
    const strokes = Array.from(
      { length: CHARACTER_DATA_IMPORT_POLICY.maxStrokeCount },
      () => "M 0 0",
    );
    const medians = strokes.map(() => [[
      CHARACTER_DATA_IMPORT_POLICY.coordinateMinimum,
      CHARACTER_DATA_IMPORT_POLICY.coordinateMaximum,
    ]]);

    expect(inspectHanziWriterCharacterData(encodeJson({
      strokes,
      medians,
      radStrokes: [0, lastStrokeIndex],
    }))).toMatchObject({
      strokeCount: CHARACTER_DATA_IMPORT_POLICY.maxStrokeCount,
      radicalStrokeIndices: [0, lastStrokeIndex],
    });
  });

  it("rejects non-UTF-8 input and a UTF-8 BOM", () => {
    expect(() => inspectHanziWriterCharacterData(
      new Uint8Array([0x7b, 0x22, 0xc3, 0x28, 0x22, 0x7d]),
    )).toThrow(/valid UTF-8/);

    const valid = encodeJson(makeCharacterData());
    const withBom = new Uint8Array(valid.byteLength + 3);
    withBom.set([0xef, 0xbb, 0xbf]);
    withBom.set(valid, 3);
    expect(() => inspectHanziWriterCharacterData(withBom)).toThrow(/BOM/);
  });

  it("rejects malformed input and trailing JSON", () => {
    expect(() => inspectHanziWriterCharacterData(
      new TextEncoder().encode("{not-json}"),
    )).toThrow(/exactly one valid JSON value/);
    expect(() => inspectHanziWriterCharacterData(
      new TextEncoder().encode(`${JSON.stringify(makeCharacterData())}\n{}`),
    )).toThrow(/exactly one valid JSON value/);
  });

  it("rejects non-object roots, unknown keys, and missing required keys", () => {
    expect(() => inspectHanziWriterCharacterData(encodeJson([]))).toThrow(
      /root must be an object/,
    );
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ source: "unreviewed" }),
    ))).toThrow(/unknown root property "source"/);
    expect(() => inspectHanziWriterCharacterData(encodeJson({
      medians: [[[0, 0]]],
    }))).toThrow(/"strokes" is required/);
  });

  it("rejects duplicate root keys including escaped spellings", () => {
    const duplicate = new TextEncoder().encode(
      "{\"strokes\":[\"M 0 0\"],\"stro\\u006bes\":[\"M 1 1\"],\"medians\":[[[0,0]]]}",
    );

    expect(() => inspectHanziWriterCharacterData(duplicate)).toThrow(
      /root property "strokes" is duplicated/,
    );
  });

  it("rejects empty, oversized, and control-bearing stroke paths", () => {
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ strokes: ["", "M 0 0"] }),
    ))).toThrow(/strokes\[0\] must be a non-empty string/);
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ strokes: ["M 0\n0", "M 0 0"] }),
    ))).toThrow(/control characters/);
    expect(() => inspectHanziWriterCharacterData(encodeJson({
      strokes: [
        "M".repeat(CHARACTER_DATA_IMPORT_POLICY.maxStrokePathCodeUnits + 1),
      ],
      medians: [[[0, 0]]],
    }))).toThrow(/exceeds .* code units/);
  });

  it("rejects an empty or oversized stroke collection", () => {
    expect(() => inspectHanziWriterCharacterData(encodeJson({
      strokes: [],
      medians: [],
    }))).toThrow(/strokes must be a non-empty array/);

    const strokes = Array.from(
      { length: CHARACTER_DATA_IMPORT_POLICY.maxStrokeCount + 1 },
      () => "M 0 0",
    );
    expect(() => inspectHanziWriterCharacterData(encodeJson({
      strokes,
      medians: strokes.map(() => [[0, 0]]),
    }))).toThrow(/stroke count .* exceeds/);
  });

  it("rejects mismatched and invalid median collections", () => {
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ medians: [[[0, 0]]] }),
    ))).toThrow(/medians length must equal strokes length/);
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ medians: [[], [[0, 0]]] }),
    ))).toThrow(/medians\[0\] must be a non-empty array/);

    const tooManyPoints = Array.from(
      { length: CHARACTER_DATA_IMPORT_POLICY.maxMedianPointsPerStroke + 1 },
      () => [0, 0],
    );
    expect(() => inspectHanziWriterCharacterData(encodeJson({
      strokes: ["M 0 0"],
      medians: [tooManyPoints],
    }))).toThrow(/medians\[0\] exceeds .* points/);
  });

  it.each([
    ["one coordinate", [0]],
    ["three coordinates", [0, 1, 2]],
    ["fractional coordinate", [0, 1.5]],
    ["string coordinate", [0, "1"]],
    ["coordinate below range", [
      CHARACTER_DATA_IMPORT_POLICY.coordinateMinimum - 1,
      0,
    ]],
    ["coordinate above range", [
      0,
      CHARACTER_DATA_IMPORT_POLICY.coordinateMaximum + 1,
    ]],
  ] as const)("rejects a median point with %s", (_label, point) => {
    expect(() => inspectHanziWriterCharacterData(encodeJson({
      strokes: ["M 0 0"],
      medians: [[point]],
    }))).toThrow(/must contain exactly two|finite integer|must be between/);
  });

  it("rejects malformed, duplicate, and out-of-range radical stroke indices", () => {
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ radStrokes: "1" }),
    ))).toThrow(/radStrokes must be an array/);
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ radStrokes: [0.5] }),
    ))).toThrow(/must be an integer/);
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ radStrokes: [1, 1] }),
    ))).toThrow(/duplicate index 1/);
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ radStrokes: [-1] }),
    ))).toThrow(/outside the stroke range/);
    expect(() => inspectHanziWriterCharacterData(encodeJson(
      makeCharacterData({ radStrokes: [2] }),
    ))).toThrow(/outside the stroke range/);
  });

  it("rejects inputs larger than one MiB before parsing", () => {
    const oversized = new Uint8Array(
      CHARACTER_DATA_IMPORT_POLICY.maxByteLength + 1,
    );
    expect(() => inspectHanziWriterCharacterData(oversized)).toThrow(
      /byte length .* exceeds/,
    );
  });

  it("rejects non-byte input", () => {
    expect(() => inspectHanziWriterCharacterData("{}" as never)).toThrow(
      /input must be a Uint8Array/,
    );
  });
});

describe("inspectCharacterLinguisticSourceRecord", () => {
  it("accepts a bounded non-empty UTF-8 JSON object", () => {
    const bytes = encodeJson({
      character: "你",
      radical: "亻",
      decomposition: "⿰亻尔",
    });

    expect(inspectCharacterLinguisticSourceRecord(bytes)).toEqual({
      ok: true,
      format: "json-object-v1",
      character: "你",
      byteLength: bytes.byteLength,
    });
  });

  it.each([
    ["empty bytes", new Uint8Array()],
    ["empty object", encodeJson({})],
    ["array root", encodeJson([{ character: "你" }])],
    ["missing character key", encodeJson({ radical: "亻" })],
    ["multi-character key", encodeJson({ character: "你好" })],
    ["binary bytes", new Uint8Array([0xff, 0xfe, 0xfd])],
    [
      "duplicate root key",
      new TextEncoder().encode("{\"character\":\"你\",\"char\\u0061cter\":\"妳\"}"),
    ],
  ])("rejects %s", (_label, bytes) => {
    expect(() => inspectCharacterLinguisticSourceRecord(bytes)).toThrow(
      /Invalid character linguistic source record/,
    );
  });
});
