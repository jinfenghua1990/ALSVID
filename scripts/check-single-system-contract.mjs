// Fail-closed structural guard for the ALSVID owner-approved single-system contract.
// This is intentionally NOT a substitute for domain integration / end-to-end tests.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const read = (path) => {
  const full = join(root, path);
  if (!existsSync(full)) {
    errors.push(`Missing mandatory single-system file: ${path}`);
    return '';
  }
  return readFileSync(full, 'utf8');
};
const mustInclude = (path, content, needle) => {
  if (!content.includes(needle)) errors.push(`${path}: missing required single-system rule/reference ${JSON.stringify(needle)}`);
};

const contractPath = 'docs/ONE_SYSTEM_DEVELOPMENT_CONTRACT.md';
const agentPath = 'AGENTS.md';
const claudePath = 'CLAUDE.md';
const copilotPath = '.github/copilot-instructions.md';
const prPath = '.github/pull_request_template.md';

const contract = read(contractPath);
const agents = read(agentPath);
const claude = read(claudePath);
const copilot = read(copilotPath);
const prTemplate = read(prPath);
for (const [path, text] of [[agentPath, agents], [claudePath, claude], [copilotPath, copilot], [prPath, prTemplate]]) {
  mustInclude(path, text, 'ONE_SYSTEM_DEVELOPMENT_CONTRACT.md');
}
for (const marker of ['唯一代码权威', '模块化单体', '数据', '跨模块', '集成测试', 'PR']) {
  mustInclude(contractPath, contract, marker);
}
for (const marker of ['上游数据来源', '下游依赖', '联动验证', 'CI']) {
  mustInclude(prPath, prTemplate, marker);
}

const workspace = read('pnpm-workspace.yaml');
for (const area of ['apps/*', 'packages/*', 'domains/*']) {
  mustInclude('pnpm-workspace.yaml', workspace, `- ${area}`);
}
const rootPkgString = read('package.json');
let rootPkg = {};
try {
  rootPkg = JSON.parse(rootPkgString);
} catch {
  errors.push('package.json: must be valid JSON');
}
if (rootPkg.private !== true) errors.push('package.json: ALSVID workspace must remain private');
if (!String(rootPkg.packageManager ?? '').startsWith('pnpm@')) errors.push('package.json: pnpm must remain the workspace package manager');
if (rootPkg.scripts?.['arch:check'] !== 'node scripts/check-architecture.mjs') {
  errors.push('package.json: required domain architecture check may not be replaced or removed');
}

for (const processName of ['web', 'api', 'worker']) {
  if (!existsSync(join(root, 'apps', processName, 'package.json'))) {
    errors.push(`apps/${processName}: missing integrated ALSVID application process`);
  }
}

for (const dir of ['apps', 'packages', 'domains']) {
  const parent = join(root, dir);
  if (!existsSync(parent)) continue;
  for (const name of readdirSync(parent)) {
    const project = join(parent, name);
    if (!statSync(project).isDirectory()) continue;
    for (const lock of ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lock', 'bun.lockb', 'pnpm-lock.yaml']) {
      if (existsSync(join(project, lock))) {
        errors.push(`${dir}/${name}/${lock}: separate application lockfile forbidden; use shared pnpm-lock.yaml`);
      }
    }
  }
}

if (errors.length) {
  console.error('ALSVID single-system contract violations:');
  for (const error of errors) console.error(`  ERROR ${error}`);
  process.exit(1);
}
console.log('ALSVID single-system structural contract check passed.');
console.log('NOTE: CI must still verify actual cross-domain behavior; passing this guard is not proof of integration.');
