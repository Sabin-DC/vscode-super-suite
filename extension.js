'use strict';
const vscode = require('vscode');
const modules = require('./src/modules');
const { createRegistry, SECTION } = require('./src/core/registry');

function activate(context) {
  const registry = createRegistry(context, modules);
  context.subscriptions.push(
    registry,
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(SECTION)) registry.sync();
    }),
    vscode.commands.registerCommand('superSuite.manageModules', () => registry.manage())
  );
  registry.sync();
}

function deactivate() {}

module.exports = { activate, deactivate };
