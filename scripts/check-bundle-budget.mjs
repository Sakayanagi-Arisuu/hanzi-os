import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { brotliCompressSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const clientRoot = resolve(root, "dist/client");
const publicRoot = resolve(root, "public");
const budgetKiB = 1024;
const budgetBytes = budgetKiB * 1024;

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
};

const clientFiles = (await walk(clientRoot)).filter((path) =>
  [".js", ".css"].includes(extname(path))
);
if (clientFiles.length === 0) throw new Error("Bundle budget check found no client JS/CSS");

const clientAssets = await Promise.all(clientFiles.map(async (path) => {
  const bytes = await readFile(path);
  return {
    path: relative(clientRoot, path).replaceAll("\\", "/"),
    rawBytes: bytes.byteLength,
    brotliBytes: brotliCompressSync(bytes).byteLength,
  };
}));
const compressedClientBytes = clientAssets.reduce((sum, asset) => sum + asset.brotliBytes, 0);

const heroFiles = (await readdir(publicRoot))
  .filter((name) => /^hanzi-awakening-hero-\d+\.(?:avif|webp)$/u.test(name));
const largestHeroBytes = Math.max(
  0,
  ...(await Promise.all(heroFiles.map(async (name) =>
    (await readFile(resolve(publicRoot, name))).byteLength
  ))),
);
// This deliberately sums every emitted client JS/CSS asset, including lazy
// route chunks, plus the largest responsive hero. It is therefore a
// conservative whole-application ceiling, not a measurement of bytes that one
// cold navigation actually requests. Lighthouse remains the network-aware
// initial-route check.
const clientAssetCeilingBytes = compressedClientBytes + largestHeroBytes;
const kib = (bytes) => (bytes / 1024).toFixed(1);

console.log(
  `Conservative client asset ceiling: ${kib(clientAssetCeilingBytes)} KiB `
  + `(all built client JS/CSS Brotli ${kib(compressedClientBytes)} KiB + largest responsive hero ${kib(largestHeroBytes)} KiB)`,
);
if (clientAssetCeilingBytes > budgetBytes) {
  console.table(clientAssets.toSorted((a, b) => b.brotliBytes - a.brotliBytes)
    .slice(0, 15).map(asset => ({
      asset: asset.path,
      rawKiB: kib(asset.rawBytes),
      brotliKiB: kib(asset.brotliBytes),
    })));
  console.warn(
    `Warning: whole-application assets exceed the ${budgetKiB} KiB advisory threshold by ${
      kib(clientAssetCeilingBytes - budgetBytes)
    } KiB. This includes lazy routes; assess actual navigation performance separately.`,
  );
}
