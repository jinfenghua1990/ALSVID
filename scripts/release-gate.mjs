import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function successfulRuns(runs, sha) {
  return runs.some(run => run.head_sha === sha && run.status === 'completed' && run.conclusion === 'success');
}

export function acceptedChecks(runsByWorkflow, sha) {
  return ['ci.yml', 'test-build.yml'].every(file => successfulRuns(runsByWorkflow[file] ?? [], sha));
}

export async function acceptedRollback(runs, sha, allowed) {
  return allowed && successfulRuns(runs, sha);
}

async function main() {
  const mode = process.argv[2];
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN;
  if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GH_TOKEN are required');
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim();
  async function api(path) {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Release evidence request failed: HTTP ${response.status}`);
    return response.json();
  }
  async function checksFor(candidate, branch) {
    const runsByWorkflow = {};
    for (const file of ['ci.yml', 'test-build.yml']) {
      const result = await api(`actions/workflows/${file}/runs?head_sha=${candidate}&branch=${branch}&event=push&per_page=100`);
      runsByWorkflow[file] = result.workflow_runs;
    }
    return acceptedChecks(runsByWorkflow, candidate);
  }
  if (mode === 'checks') {
    const deadline = Date.now() + 15 * 60 * 1000;
    do {
      if (await checksFor(sha, 'develop')) {
        console.log(`开发/测试：ALSVID Development — CI and container acceptance passed for ${sha}`);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 15000));
    } while (Date.now() < deadline);
    throw new Error('Development deployment blocked: CI/container acceptance has not passed within 15 minutes');
  }
  if (mode !== 'production') throw new Error('Expected checks or production mode');
  if (process.env.ALLOW_PREVIOUS_PRODUCTION === 'true') {
    const previous = await api(`actions/workflows/production-deploy.yml/runs?head_sha=${sha}&status=success&per_page=100`);
    // Dispatch run metadata identifies the workflow ref, not necessarily its selected release_sha.
    // Only prior main-push runs are evidence of this exact production release.
    if (await acceptedRollback(previous.workflow_runs.filter(run => run.event === 'push' && run.head_branch === 'main'), sha, true)) {
      console.log(`正式/生产：ALSVID Production — previously released rollback ${sha}`);
      return;
    }
  }
  const deadline = Date.now() + 15 * 60 * 1000;
  do {
    if (await checksFor(sha, 'main')) {
      console.log(`正式/生产：ALSVID Production — CI and container acceptance passed for ${sha}`);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 15000));
  } while (Date.now() < deadline);
  throw new Error('Production deployment blocked: CI/container acceptance has not passed within 15 minutes');
}

if (process.argv[1] === '-' || (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
