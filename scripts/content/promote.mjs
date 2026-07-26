import { runContentCommand } from "./lib.mjs";

process.exitCode = await runContentCommand("promote", process.argv.slice(2));
