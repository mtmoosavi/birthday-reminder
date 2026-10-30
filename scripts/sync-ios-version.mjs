/**
 * Keeps the Xcode project's version in step with package.json, which is the
 * single source of truth for the app version.
 *
 *   node scripts/sync-ios-version.mjs
 *
 * Mirrors android/app/build.gradle: MARKETING_VERSION gets the semver name and
 * CURRENT_PROJECT_VERSION gets a monotonically increasing integer derived from
 * it (1.1.0 -> 10100), so App Store Connect always sees a newer build.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pbxproj = join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

if (!existsSync(pbxproj)) {
  console.error(`Xcode project not found: ${pbxproj}`);
  console.error('Run `npx cap add ios` first.');
  process.exit(1);
}

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
if (!match) {
  console.error(`package.json version "${version}" is not semver (expected MAJOR.MINOR.PATCH).`);
  process.exit(1);
}
const build = Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3]);

const source = readFileSync(pbxproj, 'utf8');
const updated = source
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`);

if (updated === source) {
  console.log(`No changes needed (already ${version} / ${build}).`);
} else {
  writeFileSync(pbxproj, updated);
  console.log(`iOS version set to ${version} (build ${build}).`);
}
