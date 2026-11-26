'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

require('./mock-vscode').install(); // modules `require('vscode')` at load time

const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const modDirs = fs.readdirSync(path.join(root, 'src/modules'), { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name);

test('package.json is in sync with module manifests', () => {
  execFileSync('node', ['scripts/build-manifest.js', '--check'], { cwd: root });
});

test('every module folder has index.js, module.json, README.md and is listed in src/modules/index.js', () => {
  const listed = require('../src/modules').length;
  assert.strictEqual(listed, modDirs.length, 'src/modules/index.js out of sync with folders');
  for (const d of modDirs) for (const f of ['index.js', 'module.json', 'README.md']) {
    assert.ok(fs.existsSync(path.join(root, 'src/modules', d, f)), `${d}/${f} missing`);
  }
});

test('every module has its own settings sheet with an "enabled" toggle defaulting to true', () => {
  const sheets = pkg.contributes.configuration;
  for (const mod of require('../src/modules')) {
    const key = `superSuite.${mod.id}.enabled`;
    const sheet = sheets.filter((s) => s.properties[key]);
    assert.strictEqual(sheet.length, 1, `${key} must be declared in exactly one settings sheet`);
    assert.strictEqual(sheet[0].properties[key].default, true);
    for (const k of Object.keys(sheet[0].properties)) assert.ok(k.startsWith(`superSuite.${mod.id}.`), `${k} is in the wrong sheet`);
  }
});

test('all contributed views and menus are gated on their module toggle', () => {
  for (const mod of require('../src/modules')) {
    const gate = `config.superSuite.${mod.id}.enabled`;
    const mine = (id) => id.startsWith(`superSuite.${mod.id}.`);
    for (const list of Object.values(pkg.contributes.views)) {
      for (const v of list.filter((v) => mine(v.id))) assert.ok(v.when?.includes(gate), `view ${v.id} not gated`);
    }
    for (const [menu, items] of Object.entries(pkg.contributes.menus)) {
      if (menu.startsWith('view/')) continue; // only shown inside already-gated views
      for (const m of items.filter((m) => mine(m.command) && m.when !== 'false')) {
        assert.ok(m.when?.includes(gate), `${menu}: ${m.command} not gated`);
      }
    }
  }
});

test('contributed commands match the commands the code registers', () => {
  const vscode = require('./mock-vscode').install();
  try {
    const declared = new Set(pkg.contributes.commands.map((c) => c.command));
    const { createRegistry } = require('../src/core/registry');
    const reg = createRegistry({ globalStorageUri: { fsPath: '/tmp/x' }, globalState: { get: () => [], update: async () => {} }, extensionPath: root },
      require('../src/modules'));
    reg.sync();
    vscode.commands.registerCommand('superSuite.manageModules', () => {});
    const registered = new Set(vscode.__commands.keys());
    assert.deepStrictEqual([...declared].sort(), [...registered].sort());
    reg.dispose();
  } finally { vscode.__uninstall(); }
});
