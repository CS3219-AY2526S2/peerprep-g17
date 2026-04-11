import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.NONFUNCTIONAL_BASE_URL || "http://127.0.0.1:3100";
const outDir = path.resolve(process.cwd(), "artifacts", "nonfunctional");
const started = performance.now();

const response = await fetch(`${baseUrl}/failure/user-service-down`);
const durationMs = Number((performance.now() - started).toFixed(2));
const body = await response.json();

const result = {
  generatedAt: new Date().toISOString(),
  scenario: "user_service_failure_injection",
  status: response.status,
  durationMs,
  body,
  passed:
    response.status === 503 &&
    durationMs <= 500 &&
    typeof body.error === "string" &&
    body.error.toLowerCase().includes("unavailable"),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "failure-injection-results.json"),
  JSON.stringify(result, null, 2),
);

console.log(
  `failure_injection: status=${result.status} duration=${result.durationMs}ms passed=${result.passed}`,
);

if (!result.passed) {
  process.exitCode = 1;
}
