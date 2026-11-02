import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const productionWorkflow = readFileSync(
  new URL("../.github/workflows/production-deploy.yml", import.meta.url),
  "utf8",
);
const wwwWorkflow = readFileSync(
  new URL("../.github/workflows/www-deploy.yml", import.meta.url),
  "utf8",
);

function deployTargets(workflow) {
  return [...workflow.matchAll(/gcloud run deploy\s+("[^"]+"|\S+)/g)].map(
    ([, target]) => target,
  );
}

test("full production deploy manages only the shared ALSVID Web and API services", () => {
  assert.match(productionWorkflow, /^\s*WEB_SERVICE:\s*alsvid-web\s*$/m);
  assert.match(productionWorkflow, /^\s*API_SERVICE:\s*alsvid-api\s*$/m);
  assert.deepEqual(deployTargets(productionWorkflow).sort(), [
    '"$API_SERVICE"',
    '"$WEB_SERVICE"',
  ]);
  assert.doesNotMatch(productionWorkflow, /alsvid-fc1|alsvid-pilot-x5/);
});

test("WWW-only deploy manages only the shared ALSVID Web service", () => {
  assert.match(wwwWorkflow, /^\s*WEB_SERVICE:\s*alsvid-web\s*$/m);
  assert.deepEqual(deployTargets(wwwWorkflow), ['"$WEB_SERVICE"']);
  assert.doesNotMatch(wwwWorkflow, /alsvid-fc1|alsvid-pilot-x5/);
});

test("retired isolated local Postgres/MinIO stack cannot be started by old scripts", () => {
  assert.equal(existsSync(new URL("../infra/docker-compose.yml", import.meta.url)), false);
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts["infra:up"], "node scripts/local-production.mjs up");
  assert.equal(pkg.scripts["infra:down"], "node scripts/local-production.mjs down");
  assert.equal(pkg.scripts["infra:status"], "node scripts/local-production.mjs status");
});

test("retired admin workbench is removed and old bookmarks redirect to current admin", () => {
  assert.equal(existsSync(new URL("../apps/web/app/admin-legacy/page.tsx", import.meta.url)), false);
  const nextConfig = readFileSync(new URL("../apps/web/next.config.ts", import.meta.url), "utf8");
  assert.ok(nextConfig.includes("source: '/admin-legacy', destination: '/admin', permanent: true"));
});

test("both production workflows refuse a retired or unverified GCP project/region", () => {
  for (const workflow of [productionWorkflow, wwwWorkflow]) {
    assert.ok(workflow.includes('"$GCP_PROJECT_ID" != "alsvid-production"'));
    assert.ok(workflow.includes('"$GCP_REGION" != "europe-west1"'));
  }
});
