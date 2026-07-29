import {
  assertValidHsk3PersonalDomainPackBundle,
  loadHsk3PersonalDomainPackBundle,
} from "../../src/content/hsk3PersonalDomainPack.mjs";

const bundle = loadHsk3PersonalDomainPackBundle();
const result = assertValidHsk3PersonalDomainPackBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  domainId: bundle.pack.domainId,
  summary: result.summary,
}, null, 2));
