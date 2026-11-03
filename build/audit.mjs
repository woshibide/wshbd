import path from "node:path";
import { mkdir, access, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import lighthouse from "lighthouse";
import desktop from "lighthouse/core/config/desktop-config.js";
import { launch } from "chrome-launcher";
import { root, cache, chromePath, json, save } from "./paths.mjs";

const args = process.argv.slice(2);
const arg = (key, fallback) =>
  args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const label = arg("--label", "after-local");
const base = arg("--origin", "http://127.0.0.1:4173");
const before = label.includes("before") || label.includes("production");
const routes = args.includes("--route")
  ? [arg("--route")]
  : [
      "/",
      "/about/",
      "/archive/",
      before ? "/theatre/" : "/selected/",
      "/archive/E16/",
      "/archive/M08/",
    ];
const output = path.resolve(
  arg(
    "--output",
    process.env.PORTFOLIO_REPORT_DIR || path.join(cache, "reports"),
  ),
  label,
);
const runs = Number(arg("--runs", "3"));
if (!/^[\w-]+$/.test(label) || !Number.isInteger(runs) || runs < 1)
  throw new Error("Invalid audit label or runs");
await mkdir(output, { recursive: true });
const existingPort = args.includes("--port") ? Number(arg("--port")) : null;
const chromeVersion = existingPort
  ? (
      await (
        await fetch(`http://127.0.0.1:${existingPort}/json/version`)
      ).json()
    ).Browser
  : execFileSync(chromePath, ["--version"], { encoding: "utf8" }).trim();
const environmentExists = await access(
  path.join(output, "environment.json"),
).then(
  () => true,
  () => false,
);
if (!environmentExists)
  await save(
    path.join(output, "environment.json"),
    JSON.stringify(
      {
        origin: base,
        label,
        runs,
        date: new Date().toISOString(),
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        chrome: chromeVersion,
        revision: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: root,
          encoding: "utf8",
        }).trim(),
        dirty: execFileSync("git", ["status", "--short"], {
          cwd: root,
          encoding: "utf8",
        }).trim(),
      },
      null,
      2,
    ),
  );
const summaries = [];
for (const device of ["mobile", "desktop"])
  for (const route of routes)
    for (let run = 1; run <= runs; run++) {
      const stem = `${device}-${route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replaceAll("/", "-")}-${run}`;
      const reportPath = path.join(output, `${stem}.json`);
      try {
        if (args.includes("--force")) throw new Error("Forced audit");
        await Promise.all(
          [
            reportPath,
            path.join(output, `${stem}.trace.json`),
            path.join(output, `${stem}.html`),
            path.join(output, `${stem}.jpeg`),
          ].map((file) => access(file)),
        );
        summaries.push(await json(path.join(output, `${stem}.summary.json`)));
        continue;
      } catch {}
      console.log(`AUDIT ${label} ${device} ${route} ${run}/${runs}`);
      let chrome;
      try {
        chrome = existingPort
          ? { port: existingPort }
          : await launch({
              chromePath,
              chromeFlags: [
                "--headless=new",
                "--no-first-run",
                "--disable-background-networking",
                "--disable-extensions",
                "--mute-audio",
              ],
              logLevel: "silent",
              connectionPollInterval: 100,
              maxConnectionRetries: 50,
            });
        const result = await lighthouse(
          new URL(route, base).href,
          {
            port: chrome.port,
            logLevel: "error",
            output: ["json", "html"],
            onlyCategories: ["performance"],
            maxWaitForLoad: 30000,
            maxWaitForFcp: 30000,
          },
          device === "desktop" ? desktop : undefined,
        );
        if (result.lhr.runtimeError)
          throw new Error(JSON.stringify(result.lhr.runtimeError));
        const audits = result.lhr.audits;
        const metric = (id) => audits[id]?.numericValue ?? null;
        const summary = {
          device,
          route,
          run,
          performance: Math.round(
            result.lhr.categories.performance.score * 100,
          ),
          fcp: metric("first-contentful-paint"),
          lcp: metric("largest-contentful-paint"),
          speedIndex: metric("speed-index"),
          tbt: metric("total-blocking-time"),
          cls: metric("cumulative-layout-shift"),
          bytes: metric("total-byte-weight"),
          requests: audits["network-requests"]?.details?.items?.length ?? 0,
          unusedCssBytes:
            audits["unused-css-rules"]?.details?.overallSavingsBytes ?? 0,
          unusedJsBytes:
            audits["unused-javascript"]?.details?.overallSavingsBytes ?? 0,
          lighthouseVersion: result.lhr.lighthouseVersion,
        };
        const trace = result.artifacts?.Trace;
        if (!trace?.traceEvents?.length)
          throw new Error("Lighthouse returned no performance trace");
        await save(reportPath, result.report[0]);
        await save(path.join(output, `${stem}.html`), result.report[1]);
        await save(
          path.join(output, `${stem}.summary.json`),
          JSON.stringify(summary, null, 2),
        );
        await save(
          path.join(output, `${stem}.trace.json`),
          JSON.stringify(trace),
        );
        if (result.artifacts.DevtoolsLog)
          await save(
            path.join(output, `${stem}.network.json`),
            JSON.stringify(result.artifacts.DevtoolsLog),
          );
        if (audits["final-screenshot"]?.details?.data)
          await save(
            path.join(output, `${stem}.jpeg`),
            Buffer.from(
              audits["final-screenshot"].details.data.split(",")[1],
              "base64",
            ),
          );
        await rm(path.join(output, `${stem}.error.txt`), { force: true });
        summaries.push(summary);
        console.log(JSON.stringify(summary));
      } catch (error) {
        console.error(`FAILED ${stem}: ${error.stack}`);
        await save(path.join(output, `${stem}.error.txt`), error.stack);
      } finally {
        await chrome?.kill?.();
      }
      await save(
        path.join(output, "runs.json"),
        JSON.stringify(summaries, null, 2),
      );
    }
const medians = [
  ...new Set(summaries.map((row) => `${row.device}|${row.route}`)),
].map((key) => {
  const rows = summaries.filter((row) => `${row.device}|${row.route}` === key);
  const median = (field) => {
    const values = rows
      .map((row) => row[field])
      .filter((value) => value !== null)
      .sort((a, b) => a - b);
    return values.length ? values[Math.floor(values.length / 2)] : null;
  };
  return {
    device: rows[0].device,
    route: rows[0].route,
    runs: rows.length,
    ...Object.fromEntries(
      [
        "performance",
        "fcp",
        "lcp",
        "speedIndex",
        "tbt",
        "cls",
        "bytes",
        "requests",
        "unusedCssBytes",
        "unusedJsBytes",
      ].map((field) => [field, median(field)]),
    ),
  };
});
await save(path.join(output, "medians.json"), JSON.stringify(medians, null, 2));
console.log(`Reports: ${output}`);
if (summaries.length !== routes.length * 2 * runs) process.exitCode = 1;
