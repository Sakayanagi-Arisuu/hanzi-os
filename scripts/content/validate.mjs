import { runContentCommand } from "./lib.mjs";

process.exitCode = await runContentCommand("validate", process.argv.slice(2));
