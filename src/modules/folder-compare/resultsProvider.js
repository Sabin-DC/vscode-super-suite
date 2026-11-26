'use strict';
// Folder Compare: the "Results" tree view.
const vscode = require('vscode');
const { compile } = require('./lib/ignore');

class ResultsProvider {
  constructor(ignoreStore) {
    this.ignoreStore = ignoreStore;
    this._emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._emitter.event;
    this.data = null; // { name, left, right, result }
  }
  set(data) {
    this.data = data;
    this._emitter.fire();
  }
  clear() {
    this.data = null;
    this._emitter.fire();
  }
  /** Drop entries now matched by the ignore list, without re-scanning. */
  applyIgnore() {
    if (!this.data) return;
    const isIgnored = compile(this.ignoreStore.load());
    const r = this.data.result;
    for (const k of ['modified', 'leftOnly', 'rightOnly']) r[k] = r[k].filter((e) => !isIgnored(e.rel, false));
    this._emitter.fire();
  }
  getTreeItem(el) {
    return el;
  }
  getChildren(el) {
    if (!this.data) return [];
    const { result, left, right, name } = this.data;
    if (!el) {
      const groups = [
        ['modified', 'Modified', 'diff-modified', result.modified],
        ['leftOnly', 'Only in left', 'diff-removed', result.leftOnly],
        ['rightOnly', 'Only in right', 'diff-added', result.rightOnly],
      ];
      const items = groups
        .filter(([, , , list]) => list.length)
        .map(([key, label, icon, list]) => {
          const g = new vscode.TreeItem(`${label} (${list.length})`, vscode.TreeItemCollapsibleState.Expanded);
          g.iconPath = new vscode.ThemeIcon(icon);
          g.contextValue = 'group';
          g._key = key;
          return g;
        });
      if (!items.length) {
        const t = new vscode.TreeItem(`"${name}": folders are identical`);
        t.description = `${result.identical} files`;
        t.iconPath = new vscode.ThemeIcon('pass');
        return [t];
      }
      return items;
    }
    // children of a group
    const list = result[el._key];
    return list.map((entry) => {
      const item = new vscode.TreeItem(entry.rel, vscode.TreeItemCollapsibleState.None);
      if (el._key === 'modified') {
        item.iconPath = new vscode.ThemeIcon('diff-modified');
        item.command = {
          command: 'vscode.diff',
          title: 'Open Diff',
          arguments: [vscode.Uri.file(entry.left), vscode.Uri.file(entry.right), `${entry.rel} (${name})`],
        };
      } else {
        const abs = entry.left || entry.right;
        item.iconPath = new vscode.ThemeIcon(el._key === 'leftOnly' ? 'diff-removed' : 'diff-added');
        item.command = { command: 'vscode.open', title: 'Open File', arguments: [vscode.Uri.file(abs)] };
      }
      item.tooltip = entry.rel;
      item.contextValue = 'file';
      item._entry = entry;
      return item;
    });
  }
}

module.exports = { ResultsProvider };
