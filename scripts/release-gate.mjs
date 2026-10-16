import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function successfulRuns(runs, sha) {
  return runs.some(run => run.head_sha === sha && run.status === 'completed' && run.conclusion === 'success');
}

export function acceptedChecks(runsByWorkflow, sha) {
  return successfulRuns(runsByWorkflow['ci.yml'] ?? [], sha);
}

export function acceptedJobs(jobs) {
  return ['verify', 'containers'].every(name => jobs.some(job =>
    job.name === name && job.status === 'completed' && job.conclusion === 'success'));
}

export function mainReleaseRuns(runs) {
  return runs.filter(run => run.head_branch === 'main' &&
    ['push', 'workflow_dispatch'].includes(run.event));
}

export function mainProductionRuns(runs) {
  return runs.filter(run => run.head_branch === 'main' &&
    ['push', 'workflow_run', 'workflow_dispatch'].includes(run.event));
}

export async function acceptedRollback(runs, sha, allowed) {
  return allowed && successfulRuns(runs, sha);
}

async function main() {
  const mode = process.argv[2];
  if (mode !== 'production') throw new Error('Expected production mode');
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN;
  if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GH_TOKEN are required');
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  async function api(path) {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Release evidence request failed: HTTP ${response.status}`);
    return response.json();
  }
  if (process.env.ALLOW_PREVIOUS_PRODUCTION === 'true') {
    const previous = await api(`actions/workflows/production-deploy.yml/runs?head_sha=${sha}&status=success&per_page=100`);
    if (await acceptedRollback(mainProductionRuns(previous.workflow_runs), sha, true)) {
      console.log(`ALSVID Production — previously released rollback ${sha}`);
      return;
    }
  }
  const result = await api(`actions/workflows/ci.yml/runs?head_sha=${sha}&branch=main&per_page=100`);
  result.workflow_runs = mainReleaseRuns(result.workflow_runs);
  if (acceptedChecks({ 'ci.yml': result.workflow_runs }, sha)) {
    for (const run of result.workflow_runs.filter(run => successfulRuns([run], sha))) {
      const { jobs } = await api(`actions/runs/${run.id}/jobs?per_page=100`);
      if (acceptedJobs(jobs)) {
        console.log(`ALSVID Production — CI and container acceptance passed for ${sha}`);
        return;
      }
    }
  }
  throw new Error('Production deployment blocked: this main commit needs a successful CI run with verify and containers jobs');
}

if (process.argv[1] === '-' || (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
