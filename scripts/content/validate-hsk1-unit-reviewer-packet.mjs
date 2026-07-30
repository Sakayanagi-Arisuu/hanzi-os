import {
  assertValidHsk1UnitReviewerPacketBundle,
  loadHsk1UnitReviewerPacketBundle,
} from "../../src/content/hsk1UnitReviewerPacket.mjs";

const bundle = loadHsk1UnitReviewerPacketBundle();
const result = await assertValidHsk1UnitReviewerPacketBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  packetId: bundle.packet.packetId,
  state: bundle.packet.state,
  packetSha256: bundle.packet.packetSha256,
  summary: result.summary,
}, null, 2));
