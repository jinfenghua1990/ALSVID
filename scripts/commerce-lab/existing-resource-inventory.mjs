import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Run this operational inventory through the reviewed GitHub workflow.');
const project = process.env.GCP_PROJECT_ID, region = process.env.GCP_REGION;
if (!project || !region) throw new Error('Existing production project and region must be configured.');
function read(args) {
  try {
    return { state: 'read', items: JSON.parse(execFileSync('gcloud', args, {
      encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:1024*1024,
    })) };
  } catch {
    // A failed query is never evidence that a resource does not exist.
    return { state:'not-readable', reason:'Check existing IAM permission and API availability.', items: null };
  }
}
const run = read(['run','services','list','--project',project,'--region',region,'--quiet',
  '--format=json(metadata.name,status.url)']);
const sql = read(['sql','instances','list','--project',project,'--quiet',
  '--format=json(name,region,databaseVersion,state,settings.tier)']);
const report = { checkedAt:new Date().toISOString(), project,region,cloudRun:run,cloudSql:sql,
  scope:'Metadata only. No secret values, customer data or database contents were fetched; no resource was created or changed.' };
mkdirSync('.tmp',{recursive:true});
writeFileSync('.tmp/commerce-existing-resource-inventory.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
