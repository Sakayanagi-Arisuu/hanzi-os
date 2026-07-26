import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import {
  formatLighthouseFailure,
  LIGHTHOUSE_CATEGORY_THRESHOLDS,
  lighthouseThresholdFailures,
  summarizeLighthouseRuns,
  validateLighthouseRunCount,
} from "./lighthouse-policy.mjs";
import {
  parseOwnedHarnessReadyMessage,
} from "./e2e-harness-identity.mjs";

const root = resolve(process.cwd());
const host = "127.0.0.1";
const readyNonce = randomUUID();
const lighthouseRuns = validateLighthouseRunCount(
  Number(process.env.LIGHTHOUSE_RUNS ?? "3"),
);

const delay = (milliseconds) => new Promise((resolveDelay) => {
  setTimeout(resolveDelay, milliseconds);
});

async function waitForServer(processHandle) {
  const ready = await new Promise((resolveReady, rejectReady) => {
    const timer = setTimeout(() => {
      cleanup();
      rejectReady(new Error("Production harness readiness timed out"));
    }, 20_000);
    const handleMessage = (message) => {
      const parsed = parseOwnedHarnessReadyMessage(message, readyNonce);
      if (!parsed) return;
      cleanup();
      resolveReady(parsed);
    };
    const handleExit = (code) => {
      cleanup();
      rejectReady(new Error(`Production harness exited with code ${code}`));
    };
    const cleanup = () => {
      clearTimeout(timer);
      processHandle.off("message", handleMessage);
      processHandle.off("exit", handleExit);
    };
    processHandle.on("message", handleMessage);
    processHandle.on("exit", handleExit);
  });
  const ownedOrigin = `http://${host}:${ready.port}`;
  const response = await fetch(`${ownedOrigin}/__e2e__/ready`, {
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.nonce !== readyNonce) {
    throw new Error("Production harness ownership check failed");
  }
  return ownedOrigin;
}

async function stopServer(processHandle, origin) {
  if (processHandle.exitCode !== null) return;
  try {
    await fetch(`${origin}/__e2e__/shutdown`, {
      method: "POST",
      headers: { "x-e2e-nonce": readyNonce },
    });
  } catch {
    // Fall through to the bounded process shutdown below.
  }

  await Promise.race([once(processHandle, "exit"), delay(2_000)]);
  if (processHandle.exitCode === null) processHandle.kill("SIGTERM");
}

async function stopChrome(chromeHandle) {
  if (chromeHandle.process.exitCode !== null) return;
  const exitPromise = once(chromeHandle.process, "exit");

  try {
    const version = await fetch(`http://127.0.0.1:${chromeHandle.port}/json/version`).then((response) => (
      response.json()
    ));
    await new Promise((resolveClose, rejectClose) => {
      const socket = new WebSocket(version.webSocketDebuggerUrl);
      const timer = setTimeout(() => rejectClose(new Error("Chrome DevTools close timed out")), 2_000);
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ id: 1, method: "Browser.close" }));
      });
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(String(event.data));
        if (message.id !== 1) return;
        clearTimeout(timer);
        socket.close();
        resolveClose();
      });
      socket.addEventListener("close", () => {
        clearTimeout(timer);
        resolveClose();
      });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        rejectClose(new Error("Chrome DevTools close failed"));
      });
    });
  } catch (error) {
    console.warn(`Graceful Chrome shutdown warning: ${error instanceof Error ? error.message : String(error)}`);
  }

  await Promise.race([exitPromise, delay(4_000)]);
  if (chromeHandle.process.exitCode === null) chromeHandle.process.kill();
}

const server = spawn(process.execPath, ["scripts/serve-production-e2e.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    E2E_HOST: host,
    E2E_PORT: "0",
    E2E_READY_NONCE: readyNonce,
  },
  stdio: ["ignore", "inherit", "inherit", "ipc"],
});

let chrome;
let origin;
const chromeProfiles = [];
try {
  origin = await waitForServer(server);
  const results = [];
  for (let run = 1; run <= lighthouseRuns; run += 1) {
    const chromeProfile = await mkdtemp(
      resolve(root, ".lighthouse-profile-"),
    );
    chromeProfiles.push(chromeProfile);
    chrome = await launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
      userDataDir: chromeProfile,
    });
    let runResult;
    try {
      runResult = await lighthouse(origin, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: Object.keys(LIGHTHOUSE_CATEGORY_THRESHOLDS),
      });
    } finally {
      await stopChrome(chrome);
      chrome = undefined;
    }
    if (!runResult) throw new Error(`Lighthouse run ${run} did not return a result`);
    results.push(runResult);
    const runScores = Object.fromEntries(
      Object.keys(LIGHTHOUSE_CATEGORY_THRESHOLDS).map((category) => [
        category,
        runResult.lhr.categories[category]?.score,
      ]),
    );
    const runLcp = runResult.lhr.audits["largest-contentful-paint"]
      ?.numericValue;
    const runCls = runResult.lhr.audits["cumulative-layout-shift"]
      ?.numericValue;
    const runTbt = runResult.lhr.audits["total-blocking-time"]
      ?.numericValue;
    console.log(
      `Lighthouse run ${run}/${lighthouseRuns}: `
      + `P ${Math.round((runScores.performance ?? 0) * 100)}, `
      + `A11y ${Math.round((runScores.accessibility ?? 0) * 100)}, `
      + `BP ${Math.round((runScores["best-practices"] ?? 0) * 100)}, `
      + `SEO ${Math.round((runScores.seo ?? 0) * 100)}, `
      + `LCP ${typeof runLcp === "number" ? runLcp.toFixed(0) : "missing"}ms, `
      + `CLS ${typeof runCls === "number" ? runCls.toFixed(3) : "missing"}, `
      + `TBT ${typeof runTbt === "number" ? runTbt.toFixed(0) : "missing"}ms`,
    );
  }
  const result = [...results].sort((left, right) => (
    (left.lhr.categories.performance.score ?? 0)
    - (right.lhr.categories.performance.score ?? 0)
  ))[Math.floor(results.length / 2)];
  const reportPath = process.env.LIGHTHOUSE_REPORT_PATH;
  if (reportPath) {
    await writeFile(resolve(root, reportPath), result.report, "utf8");
  }

  const { metrics, scores } = summarizeLighthouseRuns(
    results.map((runResult) => runResult.lhr),
  );

  console.log("Lighthouse cold-profile median mobile scores:");
  for (const [category, score] of Object.entries(scores)) {
    console.log(`  ${category}: ${Math.round(score * 100)}`);
  }
  console.log(
    `Core lab metrics: LCP ${metrics["largest-contentful-paint"].toFixed(0)}ms, `
    + `CLS ${metrics["cumulative-layout-shift"].toFixed(3)}, `
    + `TBT ${metrics["total-blocking-time"].toFixed(0)}ms`,
  );

  for (const category of Object.keys(LIGHTHOUSE_CATEGORY_THRESHOLDS)) {
    const failedAudits = result.lhr.categories[category].auditRefs
      .filter((reference) => reference.weight > 0)
      .map((reference) => result.lhr.audits[reference.id])
      .filter((audit) => audit && audit.score !== null && audit.score < 1);
    if (failedAudits.length === 0) continue;
    console.log(`${category} findings:`);
    for (const audit of failedAudits) {
      console.log(`  - ${audit.id}: ${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ""}`);
    }
  }

  const opportunities = Object.values(result.lhr.audits)
    .filter((audit) => (audit.details?.overallSavingsMs ?? 0) > 0)
    .sort((left, right) => (
      (right.details?.overallSavingsMs ?? 0) - (left.details?.overallSavingsMs ?? 0)
    ));
  if (opportunities.length > 0) {
    console.log("Performance opportunities:");
    for (const audit of opportunities.slice(0, 8)) {
      console.log(`  - ${audit.id}: ${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ""}`);
    }
  }

  for (const auditId of ["errors-in-console", "inspector-issues"]) {
    const audit = result.lhr.audits[auditId];
    const items = audit?.details?.items;
    if (!Array.isArray(items) || items.length === 0) continue;
    console.log(`${auditId} details:`);
    for (const item of items.slice(0, 8)) {
      const detail = item.description ?? item.source ?? item.code ?? item.url ?? item;
      console.log(`  - ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
    }
  }

  const failures = lighthouseThresholdFailures({ metrics, scores });
  if (failures.length > 0) {
    throw new Error(
      `Lighthouse thresholds failed: ${
        failures.map(formatLighthouseFailure).join(", ")
      }`,
    );
  }
} finally {
  if (chrome) {
    await stopChrome(chrome);
  }
  if (origin) await stopServer(server, origin);
  else if (server.exitCode === null) server.kill("SIGTERM");
  await Promise.all(chromeProfiles.map((chromeProfile) =>
    rm(chromeProfile, {
      recursive: true,
      force: true,
      maxRetries: 10,
    }).catch((error) => {
      console.warn(
        `Lighthouse profile cleanup warning: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    })
  ));
}
