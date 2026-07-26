import { runContentCommand } from "./lib.mjs";

process.exitCode = await runContentCommand("submit-review", process.argv.slice(2));
