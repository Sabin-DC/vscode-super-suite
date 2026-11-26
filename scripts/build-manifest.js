#!/usr/bin/env node
'use strict';
// Rebuilds package.json "contributes" from src/core/module.json + src/modules/*/module.json.
//   node scripts/build-manifest.js          write package.json
//   node scripts/build-manifest.js --check  fail if package.json is out of date (for CI / pre-publish)
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');

function fragments() {
  const list = [path.join(root, 'src/core/module.json')];
  const modulesDir = path.join(root, 'src/modules');
  for (const d of fs.readdirSync(modulesDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const f = path.join(modulesDir, d.name, 'module.json');
    if (d.isDirectory() && fs.existsSync(f)) list.push(f);
  }
  return list;
}

/** Arrays concatenate, objects merge recursively. */
function merge(into, from) {
  for (const [k, v] of Object.entries(from)) {
    if (Array.isArray(v)) into[k] = [...(into[k] || []), ...v];
    else if (v && typeof v === 'object') into[k] = merge(into[k] || {}, v);
    else into[k] = v;
  }
  return into;
}

function build() {
  const contributes = {};
  const configuration = [];
  for (const f of fragments()) {
    const { configuration: cfg, ...rest } = JSON.parse(fs.readFileSync(f, 'utf8'));
    merge(contributes, rest);
    if (cfg) configuration.push(cfg);
  }
  configuration.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  if (configuration.length) contributes.configuration = configuration;
  return contributes;
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const next = JSON.stringify({ ...pkg, contributes: build() }, null, 2) + '\n';
const current = fs.readFileSync(pkgPath, 'utf8');

if (process.argv.includes('--check')) {
  if (next !== current) {
    console.error('package.json is out of date. Run: npm run build:manifest');
    process.exit(1);
  }
  console.log('package.json is up to date.');
} else {
  fs.writeFileSync(pkgPath, next);
  console.log('package.json updated from module manifests.');
}
