#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const canonical = 'https://github.com/jinfenghua1990/ALSVID.git';
const label = 'com.alsvid.test-auto-update';
const home = os.homedir();
const state = path.join(home, 'Library/Application Support/ALSVID/test-auto-update');
const plistPath = path.join(home, 'Library/LaunchAgents', `${label}.plist`);
const self = fileURLToPath(import.meta.url);
const cliEnv = { ...process.env, PATH: `${path.dirname(process.execPath)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`, GIT_TERMINAL_PROMPT: '0' };

export function acceptedRelease(runs, sha) {
  return ['CI', 'ALSVID Development Build'].every(name => {
    const latest = runs.filter(r => r.name === name && r.head_sha === sha && r.event === 'push' && r.head_branch === 'main')
      .sort((a, b) => b.id - a.id)[0];
    return latest?.status === 'completed' && latest.conclusion === 'success';
  });
}
export function assertTestConfig(config) {
  if (!config.name || !/^[a-z0-9][a-z0-9_-]*$/.test(config.name)) throw new Error('无法确定现有 Test Compose 项目。');
  for (const service of ['web', 'api', 'worker']) {
    const env = config.services?.[service]?.environment;
    if (env?.NODE_ENV !== 'test' || env?.ALSVID_ENV === 'production') throw new Error('只允许更新 Development/Test，拒绝 Production 配置。');
  }
  return config.name;
}
const xml = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function agentPlist(node, script, log, searchPath) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(script)}</string><string>update</string></array>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(searchPath)}</string></dict>
<key>RunAtLoad</key><true/><key>StartInterval</key><integer>300</integer>
<key>StandardOutPath</key><string>${xml(log)}</string><key>StandardErrorPath</key><string>${xml(log)}</string>
</dict></plist>\n`;
}
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
async function run(command, args, cwd) {
  try { return (await exec(command, args, { cwd, env: cliEnv, maxBuffer: 32 * 1024 * 1024, timeout: 30 * 60 * 1000 })).stdout.trim(); }
  catch { throw new Error(`${path.basename(command)} 步骤失败；保留当前记录，下一轮重试。`); }
}
async function validRepo(p) {
  if (!await exists(path.join(p, 'infra/docker-compose.test.yml'))) return false;
  try { return /github\.com[:/]jinfenghua1990\/ALSVID(?:-Next)?(?:\.git)?\s*$/i.test(await run('git', ['remote', 'get-url', 'origin'], p)); } catch { return false; }
}
async function locateRepo(explicit) {
  if (explicit) {
    const p = path.resolve(explicit);
    if (!await validRepo(p)) throw new Error('指定目录不是 ALSVID 仓库。');
    return p;
  }
  const matches = new Set();
  if (await validRepo(process.cwd())) matches.add(process.cwd());
  try {
    const output = await run('/usr/bin/mdfind', ['kMDItemFSName == "ALSVID" || kMDItemFSName == "ALSVID-Next"'], home);
    for (const p of output.split('\n')) if (p && !p.startsWith(state) && await validRepo(p)) matches.add(p);
  } catch { /* Spotlight may be unavailable. */ }
  const skip = new Set(['Library', 'Applications', 'node_modules', 'vendor', '.git']);
  async function walk(dir, depth) {
    if (depth > 5 || matches.size > 1) return;
    let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.') || skip.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (await validRepo(p)) matches.add(p); else await walk(p, depth + 1);
    }
  }
  if (!matches.size) await walk(home, 0);
  if (matches.size !== 1) throw new Error(`找到 ${matches.size} 个项目；请用 install "/你的项目路径" 指定现有 ALSVID 项目。`);
  return [...matches][0];
}
async function envFiles(source) {
  const files = [];
  for (const p of [path.join(source, '.env'), path.join(source, 'infra/.env.test.local')]) if (await exists(p)) files.push('--env-file', p);
  return files;
}
async function install(explicit) {
  if (process.platform !== 'darwin') throw new Error('安装器仅用于 macOS M1 测试机。');
  await run('git', ['--version']); await run('docker', ['compose', 'version']);
  const source = await locateRepo(explicit);
  const files = await envFiles(source);
  const config = JSON.parse(await run('docker', ['compose', ...files, '-f', path.join(source, 'infra/docker-compose.test.yml'), 'config', '--format', 'json'], source));
  const project = assertTestConfig(config);
  await fs.mkdir(state, { recursive: true, mode: 0o700 });
  await fs.chmod(state, 0o700);
  const installed = path.join(state, 'updater.mjs');
  if (self !== installed) await fs.copyFile(self, installed);
  await fs.writeFile(path.join(state, 'settings.json'), JSON.stringify({ source, project }), { mode: 0o600 });
  await fs.mkdir(path.dirname(plistPath), { recursive: true });
  await fs.writeFile(plistPath, agentPlist(process.execPath, installed, path.join(state, 'update.log'), cliEnv.PATH));
  await run('/usr/bin/plutil', ['-lint', plistPath]);
  const domain = `gui/${process.getuid()}`;
  try { await run('/bin/launchctl', ['bootout', domain, plistPath]); } catch { /* First installation. */ }
  await run('/bin/launchctl', ['bootstrap', domain, plistPath]);
  console.log(`自动更新已安装。项目：${source}\n每 5 分钟检查已验收 main。首次构建需等待；请保持 Docker Desktop 运行。\n入口：http://localhost:8080/portal-launcher\n日志：${path.join(state, 'update.log')}`);
}
async function healthy() {
  for (const url of ['http://127.0.0.1:8080/api/health', 'http://127.0.0.1:8080/login']) {
    try { if (!(await fetch(url, { signal: AbortSignal.timeout(5000) })).ok) return false; } catch { return false; }
  }
  return true;
}
async function update() {
  const { source, project } = JSON.parse(await fs.readFile(path.join(state, 'settings.json'), 'utf8'));
  // launchd serializes this job; the lock also covers a manual invocation.
  const lock = path.join(state, 'update.lock');
  try { await fs.mkdir(lock); } catch {
    const pidFile = path.join(lock, 'pid');
    let running = true;
    try { process.kill(Number(await fs.readFile(pidFile, 'utf8')), 0); }
    catch (error) { if (error.code === 'ESRCH') running = false; }
    if (running) { console.log('另一轮更新正在运行。'); return; }
    await fs.unlink(pidFile); await fs.rmdir(lock);
    try { await fs.mkdir(lock); } catch { return; }
  }
  await fs.writeFile(path.join(lock, 'pid'), String(process.pid));
  try {
    try { await run('docker', ['info', '--format', '{{.ServerVersion}}']); } catch { console.log('Docker 尚未运行，等待下轮检查。'); return; }
    const repo = path.join(state, 'repo');
    if (!await exists(path.join(repo, '.git'))) await run('git', ['clone', canonical, repo], state);
    await run('git', ['fetch', 'origin', 'main'], repo);
    const sha = await run('git', ['rev-parse', 'origin/main'], repo);
    const response = await fetch(`https://api.github.com/repos/jinfenghua1990/ALSVID/actions/runs?head_sha=${sha}&event=push&per_page=100`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ALSVID-M1-Test-Updater' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('GitHub 检查暂不可用，等待下轮重试。');
    if (!acceptedRelease((await response.json()).workflow_runs ?? [], sha)) { console.log('最新 main 仍在验收，保留当前版本。'); return; }
    const releaseFile = path.join(state, 'release-sha');
    if (await exists(releaseFile) && (await fs.readFile(releaseFile, 'utf8')).trim() === sha && await healthy()) return;
    if (await run('git', ['status', '--porcelain'], repo)) throw new Error('自动更新目录有本地改动，停止更新以保留文件。');
    await run('git', ['checkout', '--detach', sha], repo);
    const files = await envFiles(source);
    const compose = ['compose', ...files, '-p', project, '-f', path.join(repo, 'infra/docker-compose.test.yml')];
    assertTestConfig(JSON.parse(await run('docker', [...compose, 'config', '--format', 'json'], source)));
    console.log(`${new Date().toISOString()} 构建 Test 版本 ${sha.slice(0, 12)}`);
    // Build first: an unavailable build leaves the running stack untouched.
    await run('docker', [...compose, 'build'], source);
    // A dev gateway can occupy the unified port. Stop only its gateway when present.
    if (await exists(path.join(source, 'infra/docker-compose.dev.yml'))) await run('docker', ['compose', '-f', path.join(source, 'infra/docker-compose.dev.yml'), 'stop', 'gateway'], source);
    await run('docker', [...compose, 'up', '-d', 'postgres'], source);
    await run('docker', [...compose, 'run', '--rm', 'api', 'pnpm', 'db:migrate'], source);
    await run('docker', [...compose, 'up', '-d', 'gateway', 'web', 'api', 'worker'], source);
    for (let i = 0; i < 30; i++) {
      if (await healthy()) {
        await fs.writeFile(releaseFile, `${sha}\n`, { mode: 0o600 });
        console.log(`${new Date().toISOString()} 更新成功：http://localhost:8080/portal-launcher`);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('更新后的健康检查未通过，未标记成功；下轮重试。');
  } finally { await fs.unlink(path.join(lock, 'pid')); await fs.rmdir(lock); }
}
async function main() {
  switch (process.argv[2]) {
    case 'install': await install(process.argv[3]); break;
    case 'update': await update(); break;
    case 'uninstall':
      if (process.platform !== 'darwin') throw new Error('仅用于 macOS。');
      try { await run('/bin/launchctl', ['bootout', `gui/${process.getuid()}`, plistPath]); } catch { /* Already stopped. */ }
      if (await exists(plistPath)) await fs.unlink(plistPath);
      console.log('自动更新已停用；测试容器、数据库和配置保留。'); break;
    default: console.log('用法：node macos-test-auto-update.mjs install [项目目录] | update | uninstall');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === self) main().catch(error => { console.error(error.message); process.exitCode = 1; });
