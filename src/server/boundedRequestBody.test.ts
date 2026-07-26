import { describe, expect, it } from "vitest";
import { readBoundedRequestText } from "./boundedRequestBody";

const chunkedRequest = (
  chunks: Uint8Array[],
  headers?: HeadersInit,
  onCancel?: () => void,
) => new Request("https://hanzi.example/api/mutation", {
  method: "POST",
  headers,
  body: new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = chunks.shift();
      if (next) controller.enqueue(next);
      else controller.close();
    },
    cancel() {
      onCancel?.();
    },
  }),
  duplex: "half",
} as RequestInit & { duplex: "half" });

describe("bounded request body reader", () => {
  it("reads an exact-size chunked body without trusting Content-Length", async () => {
    const encoder = new TextEncoder();
    const request = chunkedRequest([
      encoder.encode('{"word":"'),
      encoder.encode("你"),
      encoder.encode('"}'),
    ]);
    const expected = '{"word":"你"}';

    await expect(readBoundedRequestText(
      request,
      encoder.encode(expected).byteLength,
    )).resolves.toEqual({
      ok: true,
      text: expected,
      byteLength: encoder.encode(expected).byteLength,
    });
  });

  it("cancels a chunked body as soon as decoded bytes exceed the limit", async () => {
    let cancelled = false;
    const request = chunkedRequest(
      [
        new Uint8Array(5),
        new Uint8Array(6),
        new Uint8Array(100),
      ],
      undefined,
      () => {
        cancelled = true;
      },
    );

    await expect(readBoundedRequestText(request, 10)).resolves.toEqual({
      ok: false,
      reason: "too-large",
    });
    expect(cancelled).toBe(true);
  });

  it("rejects an oversized declaration before pulling the stream", async () => {
    const request = new Request("https://hanzi.example/api/mutation", {
      method: "POST",
      headers: { "content-length": "11" },
      body: new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new Uint8Array(1));
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readBoundedRequestText(request, 10)).resolves.toEqual({
      ok: false,
      reason: "too-large",
    });
    expect(request.bodyUsed).toBe(false);
  });

  it("supports an empty body and rejects an invalid configured limit", async () => {
    const request = new Request("https://hanzi.example/api/mutation", {
      method: "POST",
    });
    await expect(readBoundedRequestText(request, 0)).resolves.toEqual({
      ok: true,
      text: "",
      byteLength: 0,
    });
    await expect(readBoundedRequestText(request, -1)).rejects.toThrow(
      "Request body limit",
    );
  });
});
