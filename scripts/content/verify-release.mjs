import { runContentCommand } from "./lib.mjs";

process.exitCode = await runContentCommand("verify-release", process.argv.slice(2));
