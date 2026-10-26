import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
assertScope();
function assertScope() {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.SOURCE_BRANCH !== 'feat/crmeb-native-validation' ||
      process.env.REPO_NAME !== 'jinfenghua1990/ALSVID' || !/^[a-f0-9]{40}$/.test(process.env.EXPECTED_HEAD ?? ''))
    throw new Error('Source import is restricted to the owner-approved task branch.');
}
const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
if (git('rev-parse','HEAD') !== process.env.EXPECTED_HEAD) throw new Error('Unexpected source branch base.');
if (git('ls-remote','origin','refs/heads/' + process.env.SOURCE_BRANCH).split(/\s+/)[0] !== process.env.EXPECTED_HEAD)
  throw new Error('Remote task branch changed; import must be retried from a fresh observation.');
const definitions = [
  { name:'crmeb', repo:'crmeb/CRMEB', sha:'da8d3b93400f3c660aa54d38b54ada387c963cd9', from:'.tmp/import-crmeb', to:'external/crmeb' },
  { name:'medusa-dtc', repo:'medusajs/dtc-starter', sha:'204130a32d80b704ab509069dcc1a2f8a61f51c1', from:'.tmp/import-medusa-dtc', to:'external/medusa-dtc' },
];
const excluded = new Set(['.git','.env','.constant','.DS_Store','node_modules']);
const sources = [];
for (const source of definitions) {
  if (existsSync(source.to)) throw new Error('Refusing to overwrite an existing imported source directory.');
  const commit = execFileSync('git', ['-C', source.from, 'rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
  if (commit !== source.sha) throw new Error('Unexpected upstream source version.');
  if (!existsSync(join(source.from, 'LICENSE'))) throw new Error('Upstream license must be preserved.');
  mkdirSync(source.to, { recursive:true });
  cpSync(source.from, source.to, { recursive:true, dereference:false,
    filter:path => !excluded.has(basename(path)) });
  const hashes = [];
  function walk(dir) {
    for (const item of readdirSync(dir).sort()) {
      const path = join(dir,item), stat = lstatSync(path);
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile()) {
        if (stat.size >= 95 * 1024 * 1024) throw new Error('Oversize upstream file requires an explicit storage decision.');
        hashes.push(relative(source.to,path).replaceAll('\\\\','/') + ':' + createHash('sha256').update(readFileSync(path)).digest('hex'));
      }
    }
  }
  walk(source.to);
  sources.push({ repository:source.repo, commit:source.sha, directory:source.to, fileCount:hashes.length,
    contentManifestSha256:createHash('sha256').update(hashes.join('\n')).digest('hex'),
    excludedBasenames:[...excluded], license:'LICENSE' });
}
writeFileSync('docs/COMMERCE_SOURCE_LOCK.json', JSON.stringify({ format:1, sources,
  boundary:'Imported source snapshots; runtime integration and deployment are verified separately.' },null,2)+'\n');
git('config','user.name','github-actions[bot]');
git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');
git('add','--force','--','external/crmeb','external/medusa-dtc','docs/COMMERCE_SOURCE_LOCK.json');
git('commit','--quiet','-m','vendor(commerce-lab): import approved CRMEB and Medusa source snapshots');
if (git('ls-remote','origin','refs/heads/' + process.env.SOURCE_BRANCH).split(/\s+/)[0] !== process.env.EXPECTED_HEAD)
  throw new Error('Remote task branch changed before push; nothing has been overwritten.');
const askpass = resolve(process.env.RUNNER_TEMP, 'alsvid-source-import-askpass.sh');
writeFileSync(askpass, '#!/bin/sh\ncase "$1" in *Username*) printf "%s\\n" "x-access-token";; *) printf "%s\\n" "$GH_TOKEN";; esac\n', {mode:0o700});
execFileSync('git', ['-c','core.hooksPath=/dev/null','-c','credential.helper=','push',
  'https://github.com/jinfenghua1990/ALSVID.git', 'HEAD:refs/heads/' + process.env.SOURCE_BRANCH],
  { env:{...process.env,GIT_ASKPASS:askpass,GIT_TERMINAL_PROMPT:'0'}, stdio:['ignore','pipe','pipe'] });
console.log(JSON.stringify({ imported:sources.map(({repository,commit,directory,fileCount}) => ({repository,commit,directory,fileCount})), head:git('rev-parse','HEAD') }));
