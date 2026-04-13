import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.NONFUNCTIONAL_BASE_URL || "http://127.0.0.1:3100";
const outDir = path.resolve(process.cwd(), "artifacts", "nonfunctional");
const scenarios = [
  {
    name: "health_smoke",
    method: "GET",
    url: `${baseUrl}/health`,
    requests: 20,
    maxP95Ms: 300,
    maxErrorRate: 0,
  },
  {
    name: "question_list_smoke",
    method: "GET",
    url: `${baseUrl}/api/questions`,
    requests: 20,
    maxP95Ms: 500,
    maxErrorRate: 0,
  },
  {
    name: "match_request_smoke",
    method: "POST",
    url: `${baseUrl}/api/matches/requests`,
    body: { topic: "Arrays", difficulty: "Easy" },
    requests: 15,
    maxP95Ms: 700,
    maxErrorRate: 0.01,
  },
];

function percentile(values, ratio) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
}

async function runScenario(scenario) {
  const latencies = [];
  let failures = 0;

  for (let index = 0; index < scenario.requests; index += 1) {
    const started = performance.now();
    try {
      const response = await fetch(scenario.url, {
        method: scenario.method,
        headers: scenario.body ? { "Content-Type": "application/json" } : undefined,
        body: scenario.body ? JSON.stringify(scenario.body) : undefined,
      });
      const ended = performance.now();
      latencies.push(Number((ended - started).toFixed(2)));

      if (!response.ok) {
        failures += 1;
      }
    } catch {
      const ended = performance.now();
      latencies.push(Number((ended - started).toFixed(2)));
      failures += 1;
    }
  }

  const p95Ms = percentile(latencies, 0.95);
  const errorRate = failures / scenario.requests;
  const passed = p95Ms <= scenario.maxP95Ms && errorRate <= scenario.maxErrorRate;

  return {
    ...scenario,
    p95Ms,
    averageMs:
      latencies.reduce((sum, value) => sum + value, 0) / Math.max(latencies.length, 1),
    errorRate,
    passed,
  };
}

const results = [];
for (const scenario of scenarios) {
  results.push(await runScenario(scenario));
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "smoke-load-results.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
);

for (const result of results) {
  console.log(
    `${result.name}: p95=${result.p95Ms}ms avg=${result.averageMs.toFixed(2)}ms errorRate=${(result.errorRate * 100).toFixed(2)}% passed=${result.passed}`,
  );
}

if (results.some((result) => !result.passed)) {
  process.exitCode = 1;
}
