'use strict';
// Super Suite module: Windows Context Menu
// Opens the native Windows Explorer context menu for files/folders from inside VS Code.
// Toggle: superSuite.windowsContextMenu.enabled   Settings: superSuite.windowsContextMenu.*
const vscode = require('vscode');
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let context;
let building = null;

function findCsc() {
  const win = process.env.WINDIR || 'C:\\Windows';
  for (const fw of ['Framework64', 'Framework']) {
    const p = path.join(win, 'Microsoft.NET', fw, 'v4.0.30319', 'csc.exe');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Compile native/ShellMenu.cs once (cached by content hash) and return the exe path. */
function ensureHelper() {
  const src = path.join(__dirname, 'native', 'ShellMenu.cs');
  const hash = crypto.createHash('sha1').update(fs.readFileSync(src)).digest('hex').slice(0, 10);
  const dir = path.join(context.globalStorageUri.fsPath, 'windows-context-menu');
  fs.mkdirSync(dir, { recursive: true });
  const exe = path.join(dir, `ShellMenu-${hash}.exe`);
  if (fs.existsSync(exe)) return Promise.resolve(exe);
  if (building) return building;

  const csc = findCsc();
  if (!csc) {
    return Promise.reject(new Error('Could not find the .NET Framework compiler (csc.exe) under %WINDIR%\\Microsoft.NET.'));
  }
  building = new Promise((resolve, reject) => {
    cp.execFile(
      csc,
      ['/nologo', '/target:winexe', '/optimize+', `/out:${exe}`,
       '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', src],
      { windowsHide: true },
      (err, stdout, stderr) => {
        building = null;
        if (err) reject(new Error('Helper build failed: ' + (stdout || stderr || err.message).trim()));
        else resolve(exe);
      }
    );
  });
  return building;
}

/** Normalise the args VS Code passes (Uri, Uri[], SCM resource states) into file-system paths. */
function collectPaths(args) {
  const out = [];
  const visit = (x) => {
    if (!x) return;
    if (Array.isArray(x)) return x.forEach(visit);
    const uri = x.resourceUri || x;
    if (uri && uri.scheme === 'file' && uri.fsPath) out.push(uri.fsPath);
  };
  args.forEach(visit);
  return [...new Set(out)];
}

async function show(...args) {
  if (process.platform !== 'win32') {
    vscode.window.showInformationMessage('Super Suite: Windows Context Menu only works on Windows.');
    return;
  }
  let paths = collectPaths(args);
  if (!paths.length) {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc?.uri.scheme === 'file') paths = [doc.uri.fsPath];
  }
  if (!paths.length) {
    vscode.window.showInformationMessage('Windows Context Menu: no local file or folder selected.');
    return;
  }

  // The shell can only build one menu for items that share a parent folder.
  const parent = path.dirname(paths[0]).toLowerCase();
  const same = paths.filter((p) => path.dirname(p).toLowerCase() === parent);
  if (same.length < paths.length) {
    vscode.window.setStatusBarMessage(
      'Windows Context Menu: items from different folders were selected; using those in the first item\'s folder.', 5000);
  }

  let exe;
  try {
    exe = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'Preparing Windows menu helper...' },
      ensureHelper
    );
  } catch (err) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  const extended = vscode.workspace.getConfiguration('superSuite.windowsContextMenu').get('extendedItems', true);
  const child = cp.spawn(exe, [...(extended ? ['--extended'] : []), ...same], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (d) => (stderr += d));
  child.on('error', (e) => vscode.window.showErrorMessage('Windows Context Menu: ' + e.message));
  child.on('close', (code) => {
    if (code !== 0 && stderr.trim()) vscode.window.showErrorMessage('Windows Context Menu: ' + stderr.trim());
  });
}

/** Called by the Super Suite registry when the module is enabled. Returns a Disposable. */
function activate(ctx) {
  context = ctx;
  return vscode.Disposable.from(
    vscode.commands.registerCommand('superSuite.windowsContextMenu.show', show),
    vscode.commands.registerCommand('superSuite.windowsContextMenu.showForActiveFile', () => show()),
    { dispose: () => { context = undefined; } }
  );
}

module.exports = { id: 'windowsContextMenu', label: 'Windows Context Menu', activate };
