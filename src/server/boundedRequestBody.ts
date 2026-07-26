export type BoundedRequestTextResult =
  | {
      ok: true;
      text: string;
      byteLength: number;
    }
  | {
      ok: false;
      reason: "too-large";
    };

const declaredBodyIsTooLarge = (request: Request, maximumBytes: number) => {
  const header = request.headers.get("content-length");
  if (header === null) return false;
  if (!/^(0|[1-9]\d*)$/u.test(header)) return true;
  const declaredLength = Number(header);
  return !Number.isSafeInteger(declaredLength)
    || declaredLength > maximumBytes;
};

/**
 * Reads a request body with a hard decoded-byte ceiling. Content-Length is
 * only an early rejection hint: chunked bodies and dishonest/missing headers
 * are still bounded while streaming, before the whole payload is buffered.
 */
export async function readBoundedRequestText(
  request: Request,
  maximumBytes: number,
): Promise<BoundedRequestTextResult> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
    throw new Error("Request body limit must be a non-negative safe integer.");
  }
  if (declaredBodyIsTooLarge(request, maximumBytes)) {
    return { ok: false, reason: "too-large" };
  }
  if (!request.body) return { ok: true, text: "", byteLength: 0 };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (!(chunk.value instanceof Uint8Array)) {
        throw new Error("Request body stream did not yield bytes.");
      }
      byteLength += chunk.value.byteLength;
      if (byteLength > maximumBytes) {
        await reader.cancel("request-body-too-large").catch(() => undefined);
        return { ok: false, reason: "too-large" };
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text, byteLength };
  } finally {
    reader.releaseLock();
  }
}
