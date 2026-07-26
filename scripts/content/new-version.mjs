import { runContentCommand } from "./lib.mjs";

process.exitCode = await runContentCommand("new-version", process.argv.slice(2));
