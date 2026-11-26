'use strict';
const vscode = require('vscode');
const os = require('os');
const path = require('path');
const fs = require('fs');

/** Expand ${workspaceFolder} and ~ then resolve to an absolute path. */
function expandPath(p) {
  let out = String(p || '').trim();
  const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (ws) out = out.replace(/\$\{workspaceFolder\}/g, ws);
  if (out === '~' || out.startsWith('~/') || out.startsWith('~\\')) {
    out = path.join(os.homedir(), out.slice(1));
  }
  return path.resolve(out);
}

async function isDir(p) {
  try {
    return (await fs.promises.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = { expandPath, isDir, newId };
