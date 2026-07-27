import { runContentCommand } from "./lib.mjs";

process.exitCode = await runContentCommand("import-audio", process.argv.slice(2));
