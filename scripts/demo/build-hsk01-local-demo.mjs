import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK01_LOCAL_DEMO_RELATIVE_PATH,
  projectHsk01LocalDemo,
} from "../../src/demo/hsk01LocalDemo.mjs";

export const buildHsk01LocalDemo = (root = process.cwd()) =>
  projectHsk01LocalDemo(root);

export const serializeHsk01LocalDemo = (manifest) =>
  `${JSON.stringify(manifest, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK01_LOCAL_DEMO_RELATIVE_PATH);
  const serialized = serializeHsk01LocalDemo(
    buildHsk01LocalDemo(root),
  );
  const write = process.argv.includes("--write");
  const check = process.argv.includes("--check");
  if (write && check) {
    throw new Error("Choose either --write or --check");
  }
  if (write) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  } else if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK0-HSK1 local demo is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  if (write || check) {
    console.log(JSON.stringify({
      valid: true,
      output: HSK01_LOCAL_DEMO_RELATIVE_PATH,
      mode: write ? "write" : "check",
    }, null, 2));
  }
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
