import { runContentCommand } from "./lib.mjs";

process.exitCode = await runContentCommand("report", process.argv.slice(2));
