import {
  assertValidHsk3CultureTraditionDomainPackBundle,
  loadHsk3CultureTraditionDomainPackBundle,
} from "../../src/content/hsk3CultureTraditionDomainPack.mjs";

const result = assertValidHsk3CultureTraditionDomainPackBundle(
  loadHsk3CultureTraditionDomainPackBundle(),
);
console.log(JSON.stringify({ valid: true, ...result.summary }, null, 2));
