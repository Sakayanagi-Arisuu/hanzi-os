import { runContentCommand } from "./lib.mjs";

process.exitCode = await runContentCommand("hash", process.argv.slice(2));
