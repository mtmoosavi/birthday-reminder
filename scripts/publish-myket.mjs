#!/usr/bin/env node
/**
 * Publish / update a release on Myket (مایکت) through the official
 * Server-to-Server publishing API.
 *
 * Docs : https://myket.ir/kb/pages/developer-cd/
 * Base : https://developer.myket.ir/api/partners/applications/<packageName>/release-bundle
 *
 * The publishing flow has three steps (per Myket's own documentation):
 *   1. PUT  .../release-bundle          create/edit the bundle (title, rollout, notes)
 *   2. PUT  .../release-bundle/upload   multipart APK upload
 *   3. POST .../release-bundle/commit   submit the bundle for review
 *
 * Authentication is a single `X-Access-Token` header. Get the token once from
 * the Myket developer panel: open the app -> in-app products -> "توکن صحت‌سنجی".
 * Provide it through the MYKET_ACCESS_TOKEN environment variable or a
 * git-ignored `.myket-token` file. Never ship it inside the app.
 *
 * Usage:
 *   node scripts/publish-myket.mjs --print-notes        # notes for the current version
 *   node scripts/publish-myket.mjs --status --json      # raw API payload
 *   node scripts/publish-myket.mjs --skip-upload --yes  # re-submit an already uploaded file
 *   node scripts/publish-myket.mjs --status
 *   node scripts/publish-myket.mjs --apk "APK builds/app-release.apk" --notes "رفع اشکال"
 *   node scripts/publish-myket.mjs --no-commit          # upload only, don't submit
 *   node scripts/publish-myket.mjs --revert             # cancel the pending review
 *   node scripts/publish-myket.mjs --dry-run            # print requests, send nothing
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import process from 'node:process';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PACKAGE = 'com.mtmoosavi.birthdayreminder';
const DEFAULT_TITLE = 'یادآور تولد';
const API_ROOT = 'https://developer.myket.ir/api/partners/applications';
const VERSION = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')).version;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  options: {
    apk: { type: 'string', multiple: true },
    package: { type: 'string' },
    title: { type: 'string' },
    notes: { type: 'string' },
    'notes-en': { type: 'string' },
    'notes-file': { type: 'string' },
    json: { type: 'boolean', default: false },
    'print-notes': { type: 'boolean', default: false },
    'skip-upload': { type: 'boolean', default: false },
    rollout: { type: 'string' },
    manual: { type: 'boolean', default: false },
    commit: { type: 'boolean', default: true },
    status: { type: 'boolean', default: false },
    revert: { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    token: { type: 'string' },
    'token-file': { type: 'string' },
    timeout: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
});

if (args.help) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
  process.exit(0);
}

const pkgName = args.package ?? DEFAULT_PACKAGE;
const title = args.title ?? DEFAULT_TITLE;
const rollout = clampPercent(args.rollout);
const timeoutMs = (Number(args.timeout) || 300) * 1000;
const baseUrl = `${API_ROOT}/${encodeURIComponent(pkgName)}/release-bundle`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clampPercent(value) {
  if (value === undefined || String(value).trim() === '') return 100;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 100) {
    fail(`--rollout must be a number between 1 and 100 (got "${value}").`);
  }
  return Math.round(n);
}

function log(step, text) {
  console.log(`\n\x1b[36m==> ${step}\x1b[0m`);
  if (text) console.log(`    ${text}`);
}

function ok(text) {
  console.log(`    \x1b[32m${text}\x1b[0m`);
}

function warn(text) {
  console.log(`    \x1b[33m${text}\x1b[0m`);
}

function fail(text) {
  console.error(`\n\x1b[31mERROR: ${text}\x1b[0m`);
  process.exit(1);
}

function readToken() {
  if (args.token) return args.token.trim();
  if (process.env.MYKET_ACCESS_TOKEN?.trim()) return process.env.MYKET_ACCESS_TOKEN.trim();
  const tokenFile = resolve(REPO_ROOT, args['token-file'] ?? '.myket-token');
  if (existsSync(tokenFile)) {
    const raw = readFileSync(tokenFile, 'utf8').trim();
    if (raw) return raw.split(/\r?\n/)[0].trim();
  }
  if (args['dry-run']) return 'DRY-RUN-TOKEN';
  fail(
    'No Myket access token found.\n' +
      '  Set MYKET_ACCESS_TOKEN, pass --token, or create .myket-token (git-ignored).\n' +
      '  Get it from the Myket developer panel: app -> in-app products -> "توکن صحت‌سنجی".'
  );
}

function newestApk() {
  const dirs = [
    join(REPO_ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release'),
    join(REPO_ROOT, 'APK builds'),
  ];
  let best = null;
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.toLowerCase().endsWith('.apk')) continue;
      const full = join(dir, name);
      const mtime = statSync(full).mtimeMs;
      if (!best || mtime > best.mtime) best = { full, mtime };
    }
  }
  return best?.full ?? null;
}

/**
 * Release notes for the current version, taken from CHANGELOG.md when the CLI
 * does not provide them. Myket shows these to users in the "what's new" box,
 * so an empty changelog is almost always a mistake.
 */
function parseChangelog(version) {
  const file = join(REPO_ROOT, 'CHANGELOG.md');
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = lines.findIndex((line) => new RegExp(`^##\\s+v?${escaped}(\\s|$)`).test(line));
  if (start === -1) return null;

  const sections = { fa: [], en: [] };
  let current = 'fa';
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) break;
    const heading = lines[i].match(/^###\s+(.*)$/);
    if (heading) {
      current = /^(en|english)\b/i.test(heading[1].trim()) ? 'en' : 'fa';
      continue;
    }
    sections[current].push(lines[i]);
  }

  const notes = { fa: sections.fa.join('\n').trim(), en: sections.en.join('\n').trim() };
  return notes.fa || notes.en ? notes : null;
}

function resolveNotes() {
  const changelog = parseChangelog(VERSION);
  let fa = (args.notes ?? '').trim();
  let en = (args['notes-en'] ?? '').trim();
  const source = [];

  if (args['notes-file']) {
    const file = resolve(process.cwd(), args['notes-file']);
    if (!existsSync(file)) fail(`--notes-file not found: ${file}`);
    fa = readFileSync(file, 'utf8').trim();
    source.push(basename(file));
  } else if (fa) {
    source.push('--notes');
  }

  if (!fa && changelog?.fa) {
    fa = changelog.fa;
    source.push(`CHANGELOG.md ${VERSION} (fa)`);
  }
  if (!en && changelog?.en) {
    en = changelog.en;
    source.push(`CHANGELOG.md ${VERSION} (en)`);
  }
  return { fa, en, source };
}

async function myketFetch(url, { method, token, body, headers = {} }) {
  const res = await fetch(url, {
    method,
    headers: { 'X-Access-Token': token, Accept: 'application/json', ...headers },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { res, text, json };
}

function describeFailure({ res, text, json }) {
  if (json?.messageCode || json?.translatedMessage) {
    return `HTTP ${res.status} — ${json.messageCode ?? ''} ${json.translatedMessage ?? ''}`.trim();
  }
  return `HTTP ${res.status} — ${(text || res.statusText).slice(0, 500)}`;
}

async function confirm(question) {
  if (args.yes || process.env.CI === 'true' || !process.stdin.isTTY) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

// ---------------------------------------------------------------------------
// API operations
// ---------------------------------------------------------------------------
async function listBundles(token) {
  log('Bundles', `${pkgName}`);
  // NOTE: Myket's offset is 0-based (offset=1 returns an empty page).
  const url = `${baseUrl}?limit=20`;
  const { res, json, text } = await myketFetch(url, { method: 'GET', token });
  if (!res.ok) fail(describeFailure({ res, text, json }));
  const releases = json?.releases ?? [];
  if (args.json) {
    console.log(JSON.stringify(json ?? {}, null, 2));
    return;
  }
  if (!releases.length) {
    warn('No bundles found for this package.');
    return;
  }
  for (const release of releases) {
    console.log(`\n  • ${release.title ?? '(بدون عنوان)'}  [${release.status ?? '?'}]  id=${release.id ?? '-'}`);
    for (const v of release.versions ?? []) {
      console.log(
        `      v${v.versionNumber} (code ${v.versionCode}) ${v.approvalState ?? ''} ` +
          `${v.cpuArch ?? ''} ${v.fileSize ? Math.round(v.fileSize / 1048576) + 'MB' : ''}`
      );
      const infos = v.translationInfos ?? [];
      if (!infos.length) {
        warn('notes: (none)');
      }
      for (const t of infos) {
        const body = String(t.description ?? '').replace(/\s+/g, ' ').trim();
        console.log(`      notes[${t.language}]: ${body ? body.slice(0, 300) : '(empty)'}`);
      }
    }
  }
}

async function revertBundle(token) {
  log('Revert', 'cancelling the pending review request');
  if (args['dry-run']) return ok('[dry-run] DELETE /release-bundle/revert');
  const { res, json, text } = await myketFetch(`${baseUrl}/revert`, { method: 'DELETE', token });
  if (!res.ok) fail(describeFailure({ res, text, json }));
  ok('Reverted.');
}

async function setBundleInfo(token, notes, notesEn) {
  log('Step 1/3 — bundle info', `title="${title}", rollout=${rollout}%`);
  const payload = {
    title,
    stagedRolloutPercent: rollout,
    translationInfos: [
      { language: 'fa', description: notes },
      ...(notesEn ? [{ language: 'en', description: notesEn }] : []),
    ],
  };
  if (args['dry-run']) {
    console.log(`    PUT ${baseUrl}\n    ${JSON.stringify(payload)}`);
    return;
  }
  const { res, json, text } = await myketFetch(baseUrl, {
    method: 'PUT',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) fail(describeFailure({ res, text, json }));
  ok('Bundle info saved.');
}

async function uploadApk(token, apkPath) {
  const sizeMb = (statSync(apkPath).size / 1048576).toFixed(2);
  log('Step 2/3 — upload APK', `${basename(apkPath)} (${sizeMb} MB)`);
  if (args['dry-run']) return ok('[dry-run] PUT /release-bundle/upload');
  if (statSync(apkPath).size > 500 * 1024 * 1024) {
    fail('APK is larger than Myket\'s 500 MB API limit; upload it from the panel instead.');
  }
  const buffer = readFileSync(apkPath);
  const form = new FormData();
  // Myket expects the file part with an empty field name:
  //   curl --form '=@"app.apk"'
  form.append('', new Blob([buffer], { type: 'application/vnd.android.package-archive' }), basename(apkPath));
  const { res, json, text } = await myketFetch(`${baseUrl}/upload`, { method: 'PUT', token, body: form });
  if (!res.ok) fail(describeFailure({ res, text, json }));
  ok('APK uploaded.');
}

async function commitBundle(token, notes) {
  log('Step 3/3 — submit for review', args.manual ? 'manual publish after approval' : 'auto-publish after approval');
  if (args['dry-run']) return ok('[dry-run] POST /release-bundle/commit');
  const payload = {
    isManualPublish: Boolean(args.manual),
    message: (notes || `انتشار نسخه ${title}`).slice(0, 500),
  };
  const { res, json, text } = await myketFetch(`${baseUrl}/commit`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) fail(describeFailure({ res, text, json }));
  ok('Submitted. Myket will review the bundle before it goes live.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Used by CI to render release-notes.md straight from CHANGELOG.md.
  if (args['print-notes']) {
    const { fa } = resolveNotes();
    if (!fa) fail(`No release notes found for version ${VERSION} (CHANGELOG.md / --notes).`);
    process.stdout.write(fa.endsWith('\n') ? fa : `${fa}\n`);
    return;
  }

  const token = readToken();

  if (args.status) return listBundles(token);
  if (args.revert) return revertBundle(token);

  const apkPaths = (args.apk?.length ? args.apk : [newestApk()].filter(Boolean)).map((p) =>
    resolve(process.cwd(), p)
  );
  if (!apkPaths.length && !args['skip-upload']) {
    fail('No release APK found. Build one first (npm run android:offline -- -Variant release) or pass --apk <path>.');
  }
  for (const apk of apkPaths) {
    if (!existsSync(apk)) fail(`APK not found: ${apk}`);
  }

  const { fa: notes, en: notesEn, source: notesSource } = resolveNotes();
  console.log(`\n\x1b[1mPublishing to Myket\x1b[0m`);
  console.log(`    package : ${pkgName}`);
  console.log(`    title   : ${title}`);
  console.log(`    rollout : ${rollout}%`);
  for (const apk of apkPaths) {
    const sha = createHash('sha256').update(readFileSync(apk)).digest('hex');
    const mb = (statSync(apk).size / 1048576).toFixed(2);
    console.log(`    apk     : ${apk}`);
    console.log(`              ${mb} MB  sha256:${sha.slice(0, 16)}…`);
  }
  if (notes) {
    console.log(`    notes   : ${notes.replace(/\s+/g, ' ').slice(0, 120)}`);
    if (notesSource.length) console.log(`    source  : ${notesSource.join(', ')}`);
  } else {
    warn('No release notes: --notes, --notes-file and CHANGELOG.md are all empty.');
  }
  if (notesEn) console.log(`    notes en: ${notesEn.replace(/\s+/g, ' ').slice(0, 120)}`);

  if (!args['dry-run'] && !(await confirm('\nSubmit this release to Myket for review?'))) {
    fail('Aborted.');
  }

  await setBundleInfo(token, notes, notesEn);
  if (args['skip-upload']) {
    warn('Skipped APK upload (--skip-upload): this bundle keeps the file Myket already has.');
  } else {
    for (const apk of apkPaths) await uploadApk(token, apk);
  }
  if (args.commit) await commitBundle(token, notes);
  else warn('Skipped commit (--no-commit). The bundle stays in "JustCreated" until you submit it.');

  console.log('');
  ok('Done.');
}

main().catch((err) => fail(err?.stack ?? String(err)));
