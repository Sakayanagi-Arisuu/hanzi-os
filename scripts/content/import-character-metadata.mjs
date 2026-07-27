import { runContentCommand } from "./lib.mjs";

process.exitCode = await runContentCommand(
  "import-character-metadata",
  process.argv.slice(2),
);
