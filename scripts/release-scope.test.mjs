import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

// Exercise the actual dispatch case statement so tests cannot drift from CI.
const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const dispatch = workflow.slice(workflow.indexOf('          full_stack=true'));
const statement = dispatch.match(/case "\$file" in[\s\S]*?esac/)[0];
function fullStack(paths) {
  return execFileSync('bash', ['-c', `
    full_stack=false
    for file in "$@"; do
      ${statement}
    done
    printf '%s' "$full_stack"
  `, 'release-scope', ...paths], { encoding: 'utf8' }).endsWith('true');
}

test('web and documentation changes retain the web-only release path', () => {
  assert.equal(fullStack(['apps/web/app/page.tsx', 'docs/RELEASE_FLOW.md']), false);
});

test('backend code and shared build inputs require a full-platform release', () => {
  for (const path of [
    'domains/identity/src/application/identity-service.ts',
    'domains/commerce/src/infrastructure/repository.ts',
    'apps/api/src/auth.controller.ts', 'apps/worker/src/main.ts',
    'packages/database/migrations/001.sql', 'packages/ui/src/index.ts',
    'pnpm-lock.yaml', 'package.json', 'pnpm-workspace.yaml',
    'tsconfig.base.json', '.npmrc', '.dockerignore',
    'scripts/prepare-runtime-workspaces.mjs', 'infra/docker/Dockerfile.api',
    '.github/workflows/production-deploy.yml', 'future-runtime/config.json',
  ]) assert.equal(fullStack(['apps/web/app/page.tsx', path]), true, path);
});

test('missing parent history conservatively defaults to full-platform release', () => {
  assert.match(dispatch, /^          full_stack=true\n          if git rev-parse/);
});
