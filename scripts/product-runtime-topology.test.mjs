import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
