'use strict';
// Folder Compare: run one button's comparison and publish the results.
const vscode = require('vscode');
const { compareFolders } = require('./lib/compare');
const { compile } = require('./lib/ignore');
const { expandPath, isDir } = require('./util');

async function runComparison(button, results, ignoreStore) {
  const left = expandPath(button.left);
  const right = expandPath(button.right);

  for (const [label, p] of [['Left', left], ['Right', right]]) {
    if (!(await isDir(p))) {
      vscode.window.showErrorMessage(`Folder Compare "${button.name}": ${label} folder not found: ${p}`);
      return;
    }
  }

  const cfg = vscode.workspace.getConfiguration('superSuite.folderCompare');
  const ignore = cfg.get('ignore', []);
  const ignoreLineEndings = cfg.get('ignoreLineEndings', true);
  const isIgnored = compile(ignoreStore.load());
  let result;
  try {
    result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: `Comparing "${button.name}"...` },
      () => compareFolders(left, right, ignore, { ignoreLineEndings, isIgnored })
    );
  } catch (err) {
    vscode.window.showErrorMessage(`Folder Compare "${button.name}" failed: ${err.message}`);
    return;
  }

  results.set({ name: button.name, left, right, result });
  vscode.commands.executeCommand('superSuite.folderCompare.results.focus');

  const total = result.modified.length + result.leftOnly.length + result.rightOnly.length;
  if (total === 0) {
    vscode.window.showInformationMessage(`"${button.name}": folders are identical (${result.identical} files).`);
  } else {
    vscode.window.setStatusBarMessage(
      `"${button.name}": ${result.modified.length} modified, ${result.leftOnly.length} left-only, ${result.rightOnly.length} right-only`,
      8000
    );
  }
}

module.exports = { runComparison };
