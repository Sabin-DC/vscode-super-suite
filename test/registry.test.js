'use strict';
const { test } = require('node:test');
const assert = require('node:assert');

const ctx = () => ({ globalStorageUri: { fsPath: '/tmp/ss-test' }, globalState: { get: () => [], update: async () => {} }, extensionPath: '.' });

test('modules start enabled by default and stop live when their toggle is switched off', async () => {
  const vscode = require('./mock-vscode').install();
  try {
    const { createRegistry } = require('../src/core/registry');
    const reg = createRegistry(ctx(), require('../src/modules'));
    reg.sync();
    assert.ok(vscode.__commands.has('superSuite.folderCompare.focus'));
    assert.ok(vscode.__commands.has('superSuite.windowsContextMenu.show'));
    assert.ok(vscode.__views.has('superSuite.folderCompare.buttons'));

    await vscode.workspace.getConfiguration('superSuite').update('folderCompare.enabled', false);
    reg.sync();
    assert.ok(![...vscode.__commands.keys()].some((k) => k.startsWith('superSuite.folderCompare.')), 'folder compare commands remain');
    assert.strictEqual(vscode.__views.size, 0);
    assert.ok(vscode.__commands.has('superSuite.windowsContextMenu.show'), 'other module must be unaffected');

    await vscode.workspace.getConfiguration('superSuite').update('folderCompare.enabled', true);
    reg.sync();
    assert.ok(vscode.__commands.has('superSuite.folderCompare.focus'), 're-enable restores module');
    reg.sync(); // idempotent: would throw "command already exists" if it double-registered
    reg.dispose();
    assert.strictEqual(vscode.__commands.size, 0);
  } finally { vscode.__uninstall(); }
});

test('a module that throws on start does not take down the others', () => {
  const vscode = require('./mock-vscode').install();
  try {
    const { createRegistry } = require('../src/core/registry');
    const bad = { id: 'bad', label: 'Bad', activate() { throw new Error('boom'); } };
    const good = { id: 'good', label: 'Good', activate: () => vscode.commands.registerCommand('good.cmd', () => {}) };
    const reg = createRegistry(ctx(), [bad, good]);
    reg.sync();
    assert.ok(vscode.__commands.has('good.cmd'));
    assert.ok(vscode.__messages.some(([k, m]) => k === 'error' && m.includes('Bad') && m.includes('boom')));
  } finally { vscode.__uninstall(); }
});

test('extension.js wires the registry, config listener and manage command', async () => {
  const vscode = require('./mock-vscode').install({ 'superSuite.windowsContextMenu.enabled': false });
  try {
    const ext = require('../extension');
    const context = { ...ctx(), subscriptions: [] };
    ext.activate(context);
    assert.ok(vscode.__commands.has('superSuite.manageModules'));
    assert.ok(vscode.__commands.has('superSuite.folderCompare.focus'));
    assert.ok(!vscode.__commands.has('superSuite.windowsContextMenu.show'), 'disabled-at-start module must not start');
    await vscode.workspace.getConfiguration('superSuite').update('windowsContextMenu.enabled', true);
    assert.ok(vscode.__commands.has('superSuite.windowsContextMenu.show'), 'config change enables it live');
    context.subscriptions.forEach((d) => d.dispose());
    assert.strictEqual(vscode.__commands.size, 0);
  } finally { vscode.__uninstall(); }
});
