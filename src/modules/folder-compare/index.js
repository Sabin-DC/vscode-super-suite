'use strict';
// Super Suite module: Folder Compare
// Named sidebar buttons that each compare two folders and open VS Code's diff editor per difference.
// Toggle: superSuite.folderCompare.enabled   Settings: superSuite.folderCompare.*
const vscode = require('vscode');
const path = require('path');
const { entryLine } = require('./lib/ignore');
const { createIgnoreStore } = require('./ignoreStore');
const { ResultsProvider } = require('./resultsProvider');
const { ButtonsViewProvider } = require('./buttonsView');
const { runComparison } = require('./runComparison');

const ID = 'superSuite.folderCompare';

/** Called by the Super Suite registry when the module is enabled. Returns a Disposable. */
function activate(context) {
  const ignoreStore = createIgnoreStore(path.join(context.globalStorageUri.fsPath, 'folder-compare', 'ignore.txt'));
  const results = new ResultsProvider(ignoreStore);
  const buttons = new ButtonsViewProvider(context, (b) => runComparison(b, results, ignoreStore));

  return vscode.Disposable.from(
    vscode.window.registerWebviewViewProvider(`${ID}.buttons`, buttons),
    vscode.window.createTreeView(`${ID}.results`, { treeDataProvider: results, canSelectMany: true }),
    vscode.commands.registerCommand(`${ID}.openIgnoreFile`, async () => {
      ignoreStore.ensure();
      await vscode.window.showTextDocument(vscode.Uri.file(ignoreStore.file));
    }),
    vscode.commands.registerCommand(`${ID}.addToIgnore`, async (clicked, selected) => {
      const items = (Array.isArray(selected) && selected.length ? selected : [clicked]).filter((i) => i && i._entry);
      if (!items.length) return;
      const added = ignoreStore.append(items.map((i) => entryLine(i._entry.rel)));
      results.applyIgnore();
      const pick = await vscode.window.showInformationMessage(
        `Added ${added} file(s) to the global ignore list.`, 'Open List');
      if (pick === 'Open List') vscode.commands.executeCommand(`${ID}.openIgnoreFile`);
    }),
    vscode.commands.registerCommand(`${ID}.clearResults`, () => results.clear()),
    vscode.commands.registerCommand(`${ID}.focus`, () => vscode.commands.executeCommand(`${ID}.buttons.focus`))
  );
}

module.exports = { id: 'folderCompare', label: 'Folder Compare', activate };
