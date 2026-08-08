import { describe, expect, it } from "vitest";
import {
  CONTENT_RELEASE_EVENT_TYPES,
  decodeContentReleaseEvent,
  encodeContentReleaseEvent,
} from "./contentReleaseEventContract";

describe("Content Release Worker event contracts v1", () => {
  it("pins the four requested contracts and rejects payload drift", async () => {
    expect(CONTENT_RELEASE_EVENT_TYPES).toEqual([
      "content.validation.requested",
      "content.release.requested",
      "content.release.completed",
      "content.release.failed",
    ]);
    const encoded = await encodeContentReleaseEvent({
      id: "event-release-requested",
      eventType: "content.release.requested",
      itemId: "item-1",
      revisionId: "revision-1",
      correlationId: "request:release-1",
      causationId: null,
      actorUserId: "admin",
      actorSessionId: "admin-session",
      createdAt: 1_000,
      payload: {
        revisionId: "revision-1",
        itemId: "item-1",
        stableKey: "hsk1.lesson.release-1",
        itemType: "lesson",
        contentSha256: `sha256:${"a".repeat(64)}`,
        validationSha256: `sha256:${"b".repeat(64)}`,
        requestedAt: 1_000,
        action: "publish",
        revision: 1,
      },
    });
    await expect(decodeContentReleaseEvent({
      ...encoded,
      attempts: 1,
    })).resolves.toMatchObject({
      ok: true,
      envelope: {
        eventType: "content.release.requested",
        correlationId: "request:release-1",
      },
    });
    await expect(decodeContentReleaseEvent({
      ...encoded,
      payloadJson: encoded.payloadJson.replace('"revision":1', '"revision":2'),
      attempts: 1,
    })).resolves.toEqual({
      ok: false,
      failureCode: "CONTENT_RELEASE_PAYLOAD_DIGEST_MISMATCH",
    });
  });

  it("requires archive completion to use a tombstone instead of a mutable package", async () => {
    await expect(encodeContentReleaseEvent({
      id: "event-archive-completed",
      eventType: "content.release.completed",
      itemId: "item-1",
      revisionId: "revision-1",
      correlationId: "request:archive-1",
      causationId: "event-archive-requested",
      actorUserId: null,
      actorSessionId: null,
      createdAt: 2_000,
      payload: {
        revisionId: "revision-1",
        itemId: "item-1",
        action: "archive",
        packageId: null,
        packageSha256: null,
        manifestSha256: null,
        completedAt: 2_000,
      },
    })).resolves.toMatchObject({ eventType: "content.release.completed" });
  });
});
