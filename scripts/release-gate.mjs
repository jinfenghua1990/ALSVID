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

export function releaseCandidates(runs, sha) {
  return mainReleaseRuns(runs).filter(run =>
    run.head_sha === sha &&
    (run.status === 'in_progress' || (run.status === 'completed' && run.conclusion === 'success')));
}

export function failedRequiredJobs(jobs) {
  return jobs.some(job =>
    ['verify', 'containers'].includes(job.name) &&
    job.status === 'completed' &&
    ['failure', 'cancelled', 'timed_out'].includes(job.conclusion));
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
  const candidates = releaseCandidates(result.workflow_runs ?? [], sha);

  // The CI workflow dispatches this deployment immediately after its required
  // verify/containers jobs pass. GitHub may still report the overall run as
  // in_progress, and the jobs API can lag behind the run status briefly.
  // Accept only same-SHA main push/manual runs whose required jobs are both
  // successful; retry transiently missing job records rather than failing a
  // healthy release at the exact point the deploy is dispatched.
  for (const run of candidates) {
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const { jobs = [] } = await api(`actions/runs/${run.id}/jobs?per_page=100`);
      if (failedRequiredJobs(jobs)) break;
      if (acceptedJobs(jobs)) {
        console.log(`ALSVID Production — CI and container acceptance passed for ${sha}`);
        return;
      }
      if (attempt < 12) await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  throw new Error('Production deployment blocked: this main commit needs successful verify and containers jobs from main-branch CI');
}

if (process.argv[1] === '-' || (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
