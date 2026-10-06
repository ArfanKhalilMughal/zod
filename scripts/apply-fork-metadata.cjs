'use strict';

// Re-applies the fork-specific fields from .fork-metadata.json onto packages/zod/package.json and keeps the
// fork version in package.json, jsr.json and src/v4/core/versions.ts. Used after merging upstream, so upstream
// edits to name/author/repository/version never win.
// Usage: node scripts/apply-fork-metadata.cjs [--version <x.y.z>]

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const zodDir = path.join(root, 'packages', 'zod');
const pkgPath = path.join(zodDir, 'package.json');
const meta = JSON.parse(fs.readFileSync(path.join(root, '.fork-metadata.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const versionIndex = process.argv.indexOf('--version');
const version = versionIndex > -1 ? process.argv[versionIndex + 1] : pkg.version;
const [major, minor, patch] = version.split('.').map(Number);

// Keep upstream's key order; fork-only keys (forkedFrom, publishConfig, contributors) go after "author".
const out = {};
for (const key of Object.keys(pkg)) {
  out[key] = key in meta ? meta[key] : pkg[key];
  if (key === 'author') {
    for (const extra of Object.keys(meta)) {
      if (!(extra in pkg)) out[extra] = meta[extra];
    }
  }
}
for (const key of Object.keys(meta)) {
  if (!(key in out)) out[key] = meta[key];
}
out.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(out, null, 2) + '\n');

const jsrPath = path.join(zodDir, 'jsr.json');
if (fs.existsSync(jsrPath)) {
  const jsr = JSON.parse(fs.readFileSync(jsrPath, 'utf8'));
  jsr.version = version;
  fs.writeFileSync(jsrPath, JSON.stringify(jsr, null, 2) + '\n');
}

const versionsPath = path.join(zodDir, 'src', 'v4', 'core', 'versions.ts');
fs.writeFileSync(
  versionsPath,
  `export const version = {\n  major: ${major},\n  minor: ${minor},\n  patch: ${patch} as number,\n} as const;\n`
);

console.log(`packages/zod: fork metadata applied (name=${out.name}, version=${out.version})`);
